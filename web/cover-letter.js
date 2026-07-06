// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/cover-letter.js
 * Cover letter tab: generate, save, validate, consistency report.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, showAlertModal, tabData, pendingRecommendations, CSS
 */

import { stateManager } from './state-manager.js';

// ── Module-level state ────────────────────────────────────────────────────────

const COVER_LETTER_TONES = [
  { value: 'startup/tech',   label: 'Startup / Tech'    },
  { value: 'pharma/biotech', label: 'Pharma / Biotech'  },
  { value: 'academia',       label: 'Academia'           },
  { value: 'financial',      label: 'Financial Services' },
  { value: 'leadership',     label: 'Leadership / Exec'  },
];

const COVER_LETTER_OPENINGS = [
  { value: 'formal',    label: 'Formal salutation — “Dear [name],”' },
  { value: 'hook',      label: 'Attention hook — bold claim or achievement' },
  { value: 'narrative', label: 'Narrative opener — vivid scene or story' },
];

let _coverLetterPriorSessions = [];

/** Survives tab navigation: form inputs and the generated letter body. */
let _coverLetterFormState = {
  tone:           '',
  openingStyle:   '',
  hiringManager:  '',
  companyAddress: '',
  highlight:      '',
  companyContext: '',
  letterText:     '',
  letterVisible:  false,
};

// ── Populate cover letter tab ─────────────────────────────────────────────────

async function populateCoverLetterTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading cover letter…</p></div>';

  // Fetch prior sessions with cover letters
  try {
    const res  = await fetch('/api/cover-letter/prior');
    const data = await res.json();
    _coverLetterPriorSessions = (data.sessions || []);
  } catch (_) {
    _coverLetterPriorSessions = [];
  }

  const toneOptions = COVER_LETTER_TONES.map(t =>
    `<option value="${t.value}">${escapeHtml(t.label)}</option>`
  ).join('');

  const openingOptions = COVER_LETTER_OPENINGS.map(o =>
    `<option value="${o.value}">${escapeHtml(o.label)}</option>`
  ).join('');

  const priorSection = _coverLetterPriorSessions.length ? `
    <div class="cl-prior-section">
      <h3>📋 Prior Cover Letters</h3>
      <p style="color:#6b7280;font-size:0.85em;margin-bottom:10px;">
        Select a prior letter to use as a starting point.
      </p>
      <div id="cl-prior-list">
        ${_coverLetterPriorSessions.map((s, i) => `
          <div class="cl-prior-card" id="cl-prior-${i}">
            <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="cl-prior" value="${i}" style="margin-top:3px;" />
              <div>
                <strong>${escapeHtml(s.role || 'Role')} at ${escapeHtml(s.company || 'Company')}</strong>
                <span style="color:#94a3b8;font-size:0.82em;margin-left:6px;">${escapeHtml(s.date || '')}</span>
                ${s.tone ? `<span class="cl-tone-badge">${escapeHtml(s.tone)}</span>` : ''}
                <p style="color:#64748b;font-size:0.85em;margin:4px 0 0;">${escapeHtml((s.preview || '').slice(0, 120))}…</p>
              </div>
            </label>
          </div>`).join('')}
      </div>
    </div>` : '';

  content.innerHTML = `
    <h1>📩 Cover Letter</h1>
    <p style="color:#6b7280;margin-bottom:20px;">
      Generate a tailored cover letter for this application using your CV content
      and job analysis as context.
    </p>

    ${priorSection}

    <div class="cl-form-section">
      <h3>Generation Options</h3>
      <div class="cl-form-grid">
        <div class="cl-form-field">
          <label for="cl-tone-select">Tone / Industry</label>
          <select id="cl-tone-select" class="edit-input">${toneOptions}</select>
        </div>
        <div class="cl-form-field">
          <label for="cl-opening-style">Opening Style</label>
          <select id="cl-opening-style" class="edit-input">${openingOptions}</select>
        </div>
        <div class="cl-form-field">
          <label for="cl-hiring-manager">Hiring Manager Name/Title <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
          <input type="text" id="cl-hiring-manager" class="edit-input"
              placeholder="e.g. Dr. Jane Smith, Head of Data Science" />
        </div>
      </div>
      <div class="cl-form-field" style="margin-top:12px;">
        <label for="cl-company-address">Company Address <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
        <textarea id="cl-company-address" class="edit-input" rows="2"
            style="resize:vertical;"
            placeholder="e.g. Acme Corp, 123 Main St, Boston MA 02134"></textarea>
      </div>
      <div class="cl-form-field" style="margin-top:12px;">
        <label for="cl-highlight">Specific achievement or project to highlight <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
        <input type="text" id="cl-highlight" class="edit-input"
            placeholder="e.g. Led the migration to Kubernetes saving 30% infra cost" />
      </div>
      <div class="cl-form-field" style="margin-top:12px;">
        <label for="cl-company-context">Company context <span style="color:#94a3b8;font-weight:400;">(optional — paste specific initiatives, products, values, or recent news)</span></label>
        <textarea id="cl-company-context" class="edit-input" rows="3"
            style="resize:vertical;"
            placeholder="e.g. They just launched a new AI platform for healthcare; their CTO wrote about prioritising reliability over speed…"></textarea>
      </div>
      <div style="margin-top:16px;">
        <button class="action-btn primary" id="cl-generate-btn" onclick="generateCoverLetter()">
          ✨ Generate Cover Letter
        </button>
      </div>
    </div>

    <div id="cl-result-section" style="display:none;margin-top:24px;">
      <div class="cl-result-header">
        <h3>Generated Cover Letter</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="action-btn" onclick="generateCoverLetter()" title="Regenerate">🔄 Regenerate</button>
          <button class="action-btn primary" onclick="saveCoverLetter()" id="cl-save-btn">💾 Save Cover Letter</button>
        </div>
      </div>
      <p style="color:#6b7280;font-size:0.85em;margin-bottom:8px;">
        Edit the text below before saving.
      </p>
      <textarea id="cl-letter-textarea" class="cl-letter-textarea" rows="22"
          aria-label="Cover letter text — edit as needed"
          oninput="_debouncedValidateCL(); _coverLetterFormState.letterText = this.value;"></textarea>
      <div id="cl-validation-panel" class="cl-validation-panel" style="display:none;">
        <h4>📊 Quality Checks</h4>
        <div id="cl-checks-container"></div>
      </div>
    </div>

    <div class="nav-buttons nav-end" style="margin-top:24px;">
      <button class="continue-btn" onclick="handleStepClick('screening')">📋 Proceed to Screening →</button>
    </div>
  `;

  // Restore saved form state and wire up save-on-change listeners.
  _restoreCoverLetterFormState();
}

// ── Cover letter form state helpers ──────────────────────────────────────────

function _restoreCoverLetterFormState() {
  const toneEl    = document.getElementById('cl-tone-select');
  const openingEl = document.getElementById('cl-opening-style');
  const hmEl      = document.getElementById('cl-hiring-manager');
  const addrEl    = document.getElementById('cl-company-address');
  const hlEl      = document.getElementById('cl-highlight');
  const ctxEl     = document.getElementById('cl-company-context');
  const resultEl  = document.getElementById('cl-result-section');
  const letterEl  = document.getElementById('cl-letter-textarea');

  if (toneEl && _coverLetterFormState.tone)
    toneEl.value = _coverLetterFormState.tone;
  if (openingEl && _coverLetterFormState.openingStyle)
    openingEl.value = _coverLetterFormState.openingStyle;
  if (hmEl && _coverLetterFormState.hiringManager)
    hmEl.value = _coverLetterFormState.hiringManager;
  if (addrEl && _coverLetterFormState.companyAddress)
    addrEl.value = _coverLetterFormState.companyAddress;
  if (hlEl && _coverLetterFormState.highlight)
    hlEl.value = _coverLetterFormState.highlight;
  if (ctxEl && _coverLetterFormState.companyContext)
    ctxEl.value = _coverLetterFormState.companyContext;

  if (_coverLetterFormState.letterVisible && _coverLetterFormState.letterText) {
    if (resultEl) resultEl.style.display = 'block';
    if (letterEl) {
      letterEl.value = _coverLetterFormState.letterText;
      _validateCoverLetter(letterEl.value);
    }
  }

  // Wire up save-on-change listeners (inline oninput already handles letterText).
  if (toneEl)    toneEl.addEventListener('change',   () => { _coverLetterFormState.tone = toneEl.value; });
  if (openingEl) openingEl.addEventListener('change', () => { _coverLetterFormState.openingStyle = openingEl.value; });
  if (hmEl)      hmEl.addEventListener('input',      () => { _coverLetterFormState.hiringManager = hmEl.value; });
  if (addrEl)    addrEl.addEventListener('input',    () => { _coverLetterFormState.companyAddress = addrEl.value; });
  if (hlEl)      hlEl.addEventListener('input',      () => { _coverLetterFormState.highlight = hlEl.value; });
  if (ctxEl)     ctxEl.addEventListener('input',     () => { _coverLetterFormState.companyContext = ctxEl.value; });
}

// ── Generate cover letter ─────────────────────────────────────────────────────

async function generateCoverLetter() {
  /* duckflow:
   *   id: cover_letter_ui_generate_live
   *   kind: ui
   *   timestamp: '2026-04-21T18:00:00Z'
   *   status: live
   *   handles:
   *   - ui:cover-letter.generate
   *   calls:
   *   - POST /api/cover-letter/generate
   *   reads:
   *   - dom:#cl-tone-select.value
   *   - dom:#cl-opening-style.value
   *   - dom:#cl-hiring-manager.value
   *   - dom:#cl-company-address.value
   *   - dom:#cl-highlight.value
   *   - dom:input[name=cl-prior].checked
   *   writes:
   *   - request:POST /api/cover-letter/generate.tone
   *   - request:POST /api/cover-letter/generate.opening_style
   *   - request:POST /api/cover-letter/generate.hiring_manager
   *   - request:POST /api/cover-letter/generate.company_address
   *   - request:POST /api/cover-letter/generate.highlight
   *   - request:POST /api/cover-letter/generate.reuse_body
   *   - dom:#cl-letter-textarea.value
   *   notes: Submits cover-letter prompt inputs (including configurable opening style) and optional reuse text, then writes the generated body into the editable cover-letter textarea.
   */
  const btn = document.getElementById('cl-generate-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  const tone            = (document.getElementById('cl-tone-select')      || {}).value || 'startup/tech';
  const opening_style   = (document.getElementById('cl-opening-style')    || {}).value || 'formal';
  const hiring_manager  = (document.getElementById('cl-hiring-manager')   || {}).value || '';
  const company_address = (document.getElementById('cl-company-address')  || {}).value || '';
  const highlight       = (document.getElementById('cl-highlight')         || {}).value || '';
  const company_context = (document.getElementById('cl-company-context')  || {}).value || '';

  // Check for prior letter selection
  let reuse_body = '';
  const checkedPrior = document.querySelector('input[name="cl-prior"]:checked');
  if (checkedPrior) {
    const idx = parseInt(checkedPrior.value, 10);
    reuse_body = (_coverLetterPriorSessions[idx] || {}).full_text || '';
  }

  try {
    const res  = await fetch('/api/cover-letter/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tone, opening_style, hiring_manager, company_address, highlight, company_context, reuse_body }),
    });
    const data = await res.json();

    if (data.ok) {
      const resultSection = document.getElementById('cl-result-section');
      const textarea      = document.getElementById('cl-letter-textarea');
      if (resultSection) resultSection.style.display = 'block';
      if (textarea) {
        textarea.value = data.text;
        _validateCoverLetter(textarea.value);
      }
      _coverLetterFormState.letterText    = data.text;
      _coverLetterFormState.letterVisible = true;
    } else {
      showAlertModal('❌ Generation Failed', data.error || 'LLM did not return a cover letter.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) {
      btn.disabled    = false;
      btn.textContent = '✨ Generate Cover Letter';
    }
  }
}

// ── Save cover letter ─────────────────────────────────────────────────────────

async function saveCoverLetter() {
  /* duckflow:
   *   id: cover_letter_ui_save_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:cover-letter.save
   *   calls:
   *   - POST /api/cover-letter/save
   *   reads:
   *   - dom:#cl-letter-textarea.value
   *   writes:
   *   - request:POST /api/cover-letter/save.text
   *   notes: Submits the user-edited cover-letter body for session persistence, metadata write-through, and archive artifact generation.
   */
  const textarea = document.getElementById('cl-letter-textarea');
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) {
    showAlertModal('⚠️ Empty Letter', 'Please generate or type a cover letter before saving.');
    return;
  }

  const btn = document.getElementById('cl-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  try {
    const res  = await fetch('/api/cover-letter/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json();

    if (data.ok) {
      showAlertModal('✅ Saved', `Cover letter saved as <strong>${escapeHtml(data.filename)}</strong> in your application folder.`);
    } else {
      showAlertModal('❌ Save Failed', data.error || 'Could not save cover letter.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Cover Letter'; }
  }
}

// ── Cross-document consistency report ────────────────────────────────────────

/**
 * Build and render the cross-document consistency report in the Finalise tab.
 * Checks company name, job title, ATS keywords, and date formatting across
 * the CV (tabData.cv) and cover letter (#cl-letter-textarea).
 */
function _renderConsistencyReport(statusData) {
  const panel = document.getElementById('consistency-report');
  if (!panel) return;

  const analysis    = statusData.job_analysis || {};
  const company     = (analysis.company  || '').trim();
  const jobTitle    = (analysis.title    || '').trim();
  const atsKeywords = (analysis.ats_keywords || []).filter(Boolean).slice(0, 8);

  // Strip HTML tags from CV content for text search
  const cvState = stateManager.getTabData('cv') || '';
  const cvHtml = typeof cvState === 'string' ? cvState : (cvState?.['*.html'] || '');
  const cvText = cvHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();

  // Get cover letter text if present
  const clEl   = document.getElementById('cl-letter-textarea');
  const clRaw  = clEl ? clEl.value : '';
  const clText = clRaw.toLowerCase();
  const hasCL  = clRaw.trim().length > 50;

  if (!company && !jobTitle && !atsKeywords.length) {
    panel.innerHTML = '';
    return;
  }

  const checks = [];

  // ── 1. Company name ──────────────────────────────────────────────
  if (company) {
    const compLc = company.toLowerCase();
    const inCV   = cvText.includes(compLc);
    const inCL   = hasCL && clText.includes(compLc);
    const missing = [];
    if (!inCV)          missing.push('CV');
    if (hasCL && !inCL) missing.push('cover letter');
    const status = missing.length === 0 ? 'pass' : missing.length < 2 && hasCL ? 'warn' : 'fail';
    checks.push({
      status,
      label:  'Company name',
      detail: status === 'pass'
        ? `\u201c${escapeHtml(company)}\u201d found in all documents.`
        : `\u201c${escapeHtml(company)}\u201d missing from: ${missing.join(', ')}.`,
    });
  }

  // ── 2. Job title ─────────────────────────────────────────────────
  if (jobTitle) {
    const titleLc   = jobTitle.toLowerCase();
    const titleCore = titleLc.replace(/^(senior|junior|lead|principal|staff|associate)\s+/, '');
    const inCV      = cvText.includes(titleLc) || cvText.includes(titleCore);
    const inCL      = hasCL && (clText.includes(titleLc) || clText.includes(titleCore));
    const missing   = [];
    if (!inCV)          missing.push('CV');
    if (hasCL && !inCL) missing.push('cover letter');
    const status = missing.length === 0 ? 'pass' : missing.length < 2 && hasCL ? 'warn' : 'fail';
    checks.push({
      status,
      label:  'Job title',
      detail: status === 'pass'
        ? `\u201c${escapeHtml(jobTitle)}\u201d found in all documents.`
        : `\u201c${escapeHtml(jobTitle)}\u201d missing from: ${missing.join(', ')}.`,
    });
  }

  // ── 3. ATS keywords (top 8) ──────────────────────────────────────
  if (atsKeywords.length) {
    const missingCV = atsKeywords.filter(kw => !cvText.includes(kw.toLowerCase()));
    const missingCL = hasCL ? atsKeywords.filter(kw => !clText.includes(kw.toLowerCase())) : [];
    const totalMissing = new Set([...missingCV, ...missingCL]).size;
    const status = totalMissing === 0 ? 'pass' : totalMissing <= 3 ? 'warn' : 'fail';
    const parts  = [];
    if (missingCV.length) parts.push(`Missing from CV: ${missingCV.map(k => `<em>${escapeHtml(k)}</em>`).join(', ')}`);
    if (missingCL.length) parts.push(`Missing from cover letter: ${missingCL.map(k => `<em>${escapeHtml(k)}</em>`).join(', ')}`);
    checks.push({
      status,
      label:  `ATS keywords (${atsKeywords.length} checked)`,
      detail: parts.length ? parts.join('. ') + '.' : `All ${atsKeywords.length} keywords present in documents.`,
    });
  }

  // ── 4. Date format consistency (CV) ──────────────────────────────
  if (cvText) {
    const hasWritten = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/i.test(cvText);
    const hasISO     = /\b\d{4}-\d{2}\b/.test(cvText);
    const hasSlash   = /\b\d{1,2}\/\d{4}\b/.test(cvText);
    const formatCount = [hasWritten, hasISO, hasSlash].filter(Boolean).length;
    checks.push({
      status: formatCount <= 1 ? 'pass' : 'warn',
      label:  'Date formats (CV)',
      detail: formatCount <= 1
        ? 'Consistent date format throughout CV.'
        : 'Mixed date formats detected (e.g. \u201cJan 2020\u201d and \u201c2020-01\u201d) \u2014 standardise for a polished look.',
    });
  }

  // \u2500\u2500 5. Cross-document terminology consistency \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const sqTexts = [...document.querySelectorAll('textarea[id^="sc-text-"]')]
    .map(el => el.value.toLowerCase()).filter(Boolean);
  const allDocText = [cvText, clText, ...sqTexts];

  const _TERM_PAIRS = [
    ['machine learning', 'ml'], ['artificial intelligence', 'ai'],
    ['natural language processing', 'nlp'], ['deep learning', 'dl'],
    ['large language model', 'llm'], ['user interface', 'ui'],
    ['user experience', 'ux'], ['application programming interface', 'api'],
    ['kubernetes', 'k8s'], ['continuous integration', 'ci/cd'],
  ];
  const termMismatches = [];
  for (const [long, short] of _TERM_PAIRS) {
    const re = new RegExp(`\\b${short.replace('/', '\\/')}\\b`);
    if (allDocText.some(t => t.includes(long)) && allDocText.some(t => re.test(t))) {
      termMismatches.push(`\u201c${long}\u201d / \u201c${short.toUpperCase()}\u201d`);
    }
  }
  if (termMismatches.length > 0) {
    checks.push({
      status: 'warn',
      label:  'Terminology consistency',
      detail: `Mixed forms detected across documents: ${termMismatches.join('; ')}. Standardise to one form per concept.`,
    });
  } else if (allDocText.some(t => t.length > 50)) {
    checks.push({
      status: 'pass',
      label:  'Terminology consistency',
      detail: 'No mixed abbreviation/expansion pairs detected across CV, cover letter, and screening answers.',
    });
  }

  // ── Render ────────────────────────────────────────────────────────
  const icons = { pass: '\u2705', warn: '\u26a0\ufe0f', fail: '\u274c' };
  const overallFail   = checks.some(c => c.status === 'fail');
  const overallWarn   = checks.some(c => c.status === 'warn');
  const overallStatus = overallFail ? 'fail' : overallWarn ? 'warn' : 'pass';
  const overallMsg    = overallFail
    ? 'Issues found \u2014 review before sending'
    : overallWarn ? 'Minor inconsistencies detected' : 'All checks passed';

  panel.innerHTML = `
    <div class="consistency-report">
      <div class="cr-header">
        <h3 style="margin:0;font-size:1em;">${icons[overallStatus]} Cross-Document Consistency</h3>
        <span class="cr-badge cr-${overallStatus}">${escapeHtml(overallMsg)}</span>
      </div>
      <p style="color:#6b7280;font-size:0.83em;margin:0 0 12px;">
        Checks company name, job title, ATS keywords, date formatting, and terminology consistency across CV, cover letter, and screening answers.
      </p>
      <div class="cr-checks">
        ${checks.map(c => `
          <div class="cr-check cr-${c.status}">
            <span class="cr-icon">${icons[c.status]}</span>
            <span class="cr-label">${escapeHtml(c.label)}</span>
            <span class="cr-detail">${c.detail}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Debounced validation ──────────────────────────────────────────────────────

let _clValidateTimer = null;
function _debouncedValidateCL() {
  clearTimeout(_clValidateTimer);
  _clValidateTimer = setTimeout(() => {
    const ta = document.getElementById('cl-letter-textarea');
    if (ta) _validateCoverLetter(ta.value);
  }, 600);
}

/**
 * Client-side cover letter quality checks.
 * 5 rules: opening, I-first gate, company name, word count (role-differentiated), call-to-action.
 */
function _validateCoverLetter(text) {
  const panel     = document.getElementById('cl-validation-panel');
  const container = document.getElementById('cl-checks-container');
  if (!panel || !container || !text.trim()) return;

  // ── Rule 1: Opening pattern ────────────────────────────────────
  const firstLine = (text.split('\n').find(l => l.trim()) || '').trim().toLowerCase();
  const genericOpenings = [
    /^dear hiring manager/,
    /^dear sir or madam/,
    /^to whom it may concern/,
    /^dear recruiter/,
    /^dear human resources/,
    /^dear hr/,
  ];
  const genericOpening = genericOpenings.some(re => re.test(firstLine));
  const openingCheck = {
    pass: !genericOpening,
    label: 'Opening salutation',
    detail: genericOpening
      ? 'Uses a generic opener ("Dear Hiring Manager" etc.) — personalise with a name or role.'
      : 'Personalised opener — good.',
  };

  // ── Rule 1b: Body must not open with "I" ──────────────────────
  const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const salutationIdx = allLines.findIndex(
    l => l.toLowerCase() === firstLine.toLowerCase()
  );
  const bodyLines = allLines.slice(Math.max(0, salutationIdx + 1));
  const firstBodyWord = (bodyLines.find(l => l.trim()) || '').split(/\s+/)[0] || '';
  // Split on non-alpha so "I'm" → token "I", "In" → token "In"
  const firstBodyToken = firstBodyWord.split(/[^a-zA-Z]/)[0] || '';
  const bodyStartsWithI = firstBodyToken.toLowerCase() === 'i';
  const iFirstCheck = {
    pass: !bodyStartsWithI,
    label: 'Opening word',
    detail: bodyStartsWithI
      ? 'Body opens with "I" — lead with your value, the role, or the company instead.'
      : 'Body does not open with "I" — good.',
  };

  // ── Rule 2: Company-specific reference ────────────────────────
  const companyName = _getCompanyNameForCL();
  const _clAnalysis = window._lastAnalysisData || (window.pendingRecommendations && window.pendingRecommendations.job_analysis) || {};
  const _jobTitle   = (_clAnalysis.title || '').trim();
  let companyCheck;
  if (!companyName) {
    companyCheck = { warn: true, label: 'Company reference', detail: 'Company name not detected from job description — verify manually.' };
  } else {
    const mentions = (text.toLowerCase().match(new RegExp(companyName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    companyCheck = {
      pass: mentions >= 2,
      warn: mentions === 1,
      label: 'Company reference',
      detail: mentions === 0
        ? `"${escapeHtml(companyName)}" not mentioned — add specific references.`
        : mentions === 1
          ? `"${escapeHtml(companyName)}" mentioned once — a second specific reference strengthens the letter.`
          : `"${escapeHtml(companyName)}" mentioned ${mentions} times — good specificity.`,
    };
  }

  // ── Rule 2b: Paragraph 1 contains company name and role title ──
  const _allParas   = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const _firstBody  = _allParas.find(p => !/^dear\s|^to whom/i.test(p)) || _allParas[0] || '';
  // Limit to first 100 words so a single-newline letter with no double-breaks doesn't
  // match company/role in paragraph 5 and report a false pass.
  const _p1Lc       = _firstBody.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  let para1Check;
  if (!companyName && !_jobTitle) {
    para1Check = { warn: true, label: 'Paragraph 1 role context', detail: 'Company name and role title not detected — verify paragraph 1 establishes the specific role and company.' };
  } else {
    const _missing = [];
    if (companyName && !_p1Lc.includes(companyName.toLowerCase())) _missing.push(`"${escapeHtml(companyName)}"`);
    if (_jobTitle   && !_p1Lc.includes(_jobTitle.toLowerCase()))   _missing.push(`"${escapeHtml(_jobTitle)}"`);
    para1Check = {
      pass: _missing.length === 0,
      warn: _missing.length === 1,
      fail: _missing.length >= 2,
      label: 'Paragraph 1 role context',
      detail: _missing.length === 0
        ? 'Company name and role title appear in paragraph 1 — good.'
        : `Paragraph 1 missing: ${_missing.join(' and ')} — establish the specific role and company in the opening paragraph.`,
    };
  }

  // ── Rule 3: Word count (role-differentiated target) ───────────
  const _roleAnalysis = window._lastAnalysisData ||
    (window.pendingRecommendations && window.pendingRecommendations.job_analysis) || {};
  const _roleLevel  = (_roleAnalysis.role_level || '').toLowerCase();
  const _roleDomain = (_roleAnalysis.domain || '').toLowerCase();
  const isExec      = /exec|vp|c-suite|chief|director|president|partner/.test(_roleLevel);
  const isAcademic  = /academic|research|faculty|professor|postdoc/.test(_roleDomain + ' ' + _roleLevel);
  const wcTarget    = isAcademic ? { lo: 400, hi: 500, warnLo: 350, warnHi: 550 }
                    : isExec     ? { lo: 350, hi: 450, warnLo: 300, warnHi: 500 }
                                 : { lo: 300, hi: 400, warnLo: 250, warnHi: 450 };
  const wcLabel     = isAcademic ? `${wcTarget.lo}–${wcTarget.hi} (academic/research)`
                    : isExec     ? `${wcTarget.lo}–${wcTarget.hi} (executive)`
                                 : `${wcTarget.lo}–${wcTarget.hi} (standard)`;

  const words    = text.trim().split(/\s+/).filter(Boolean).length;
  const wcPct    = Math.min(100, (words / wcTarget.hi) * 100);
  const wcColour = words < wcTarget.warnLo ? '#ef4444'
                 : words < wcTarget.lo      ? '#f59e0b'
                 : words <= wcTarget.hi     ? '#22c55e'
                 : words <= wcTarget.warnHi ? '#f59e0b'
                 : '#ef4444';
  const wcStatus = words >= wcTarget.lo && words <= wcTarget.hi ? 'pass'
                 : words >= wcTarget.warnLo && words <= wcTarget.warnHi ? 'warn'
                 : 'fail';
  const wcBar    = `<span class="cl-wc-bar"><span class="cl-wc-fill" style="width:${wcPct}%;background:${wcColour};"></span></span>`;
  const wordCountCheck = {
    [wcStatus]: true,
    label: `Word count (${wcLabel})`,
    detail: `${words} words ${wcBar} — ${
      words < wcTarget.lo ? `too short; aim for ${wcTarget.lo}–${wcTarget.hi}.`
      : words > wcTarget.hi ? `too long; trim to ${wcTarget.hi} words.`
      : 'within target range.'
    }`,
  };

  // ── Rule 4: Call-to-action closing ────────────────────────────
  const lastPara = text.split(/\n{2,}/).filter(p => p.trim()).slice(-1)[0] || '';
  // Assertive CTAs: candidate takes initiative (pass)
  const assertiveCtaPatterns = [
    /interview/i, /discuss/i, /opportunity to (speak|talk|meet|connect)/i,
    /i will (call|follow.?up|reach out|contact|send)/i,
    /i (plan|intend) to/i, /welcome the chance/i,
    /available (for|to)/i, /contact me/i,
  ];
  // Passive CTAs: waiting for a response (fail — story US-P5 requires rejection)
  const passiveCtaPatterns = [
    /hear from you/i, /look forward to (your|hearing)/i,
    /await(ing)? your/i, /hope to (hear|meet)/i,
  ];
  const hasAssertiveCta = assertiveCtaPatterns.some(re => re.test(lastPara));
  const hasPassiveCta   = passiveCtaPatterns.some(re => re.test(lastPara));
  const ctaCheck = {
    pass: hasAssertiveCta,
    fail: !hasAssertiveCta && hasPassiveCta,
    label: 'Call-to-action closing',
    detail: hasAssertiveCta
      ? 'Assertive call-to-action — takes initiative.'
      : hasPassiveCta
        ? 'Passive closing rejected — phrases like "I look forward to hearing from you" are too passive. Replace with a direct interview request: "I would welcome the opportunity to interview" or "I will follow up next week."'
        : 'No call-to-action found — add a direct interview request or proactive follow-up statement.',
  };

  // ── Rule 5: Named or quantified achievement ───────────────────
  const achievementPatterns = [
    /\d+%/,                          // percentages
    /\$[\d,]+/,                      // dollar amounts
    /\d+ (times|x|fold|year|month|week|day|team|people|staff|client|customer|project|product|system|award|patent)/i,
    /reduced|increased|grew|grew|doubled|tripled|saved|generated|delivered|launched|led|built|designed|architected|pioneered|won|awarded|earned|achieved/i,
  ];
  const hasAchievement = achievementPatterns.some(re => re.test(text));
  const achievementCheck = {
    pass: hasAchievement,
    warn: !hasAchievement,
    label: 'Specific achievement',
    detail: hasAchievement
      ? 'Contains a quantified or named achievement — good.'
      : 'No quantified achievement detected — add at least one specific result (e.g., "increased revenue by 30%", "led a team of 8").',
  };

  // ── Rule 7: Generic filler phrases (GAP-17) ──────────────────
  const _CL_FILLER = [
    'i am writing to apply', 'i am excited to apply', 'i am pleased to apply',
    'please find my', 'attached please find', 'enclosed please find',
    'this letter is to express', 'i feel i would be a great fit',
    'i believe i would be a perfect fit', 'i am confident that i',
    'results-driven', 'detail-oriented', 'seasoned professional',
    'passionate about', 'dynamic professional', 'highly motivated',
    'team player', 'self-starter', 'hard working',
  ];
  const _textLc    = text.toLowerCase();
  const foundFill  = _CL_FILLER.filter(p => _textLc.includes(p));
  const fillerCheck = {
    pass: foundFill.length === 0,
    warn: foundFill.length > 0 && foundFill.length <= 2,
    fail: foundFill.length > 2,
    label: 'Filler phrases',
    detail: foundFill.length === 0
      ? 'No generic filler phrases detected — good.'
      : `Generic phrase${foundFill.length > 1 ? 's' : ''} detected: ${foundFill.slice(0, 3).map(p => `“${p}”`).join(', ')}${foundFill.length > 3 ? '…' : ''} — replace with specific value claims.`,
  };

  // ── Render ─────────────────────────────────────────────────────
  const checks = [openingCheck, iFirstCheck, companyCheck, para1Check, wordCountCheck, ctaCheck, achievementCheck, fillerCheck];
  container.innerHTML = checks.map(c => {
    const state = c.pass ? 'pass' : c.warn ? 'warn' : 'fail';
    return `<div class="cl-check ${state}">
      <span class="cc-icon"></span>
      <span class="cc-label">${escapeHtml(c.label)}</span>
      <span class="cc-detail">${c.detail}</span>
    </div>`;
  }).join('');

  panel.style.display = 'block';
}

// ── Get company name for cover letter validation ──────────────────────────────

function _getCompanyNameForCL() {
  // Try analysis data first, then fall back to job description first line
  const analysis = window._lastAnalysisData || (window.pendingRecommendations && window.pendingRecommendations.job_analysis);
  if (analysis && analysis.company_name) return analysis.company_name;
  if (analysis && analysis.company)      return analysis.company;
  // Fall back: first non-empty line of job description in tabData
  const jd = stateManager.getTabData('job') || '';
  const firstLine = jd.split('\n').find(l => l.trim());
  return firstLine ? firstLine.trim().slice(0, 60) : '';
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  COVER_LETTER_TONES,
  _coverLetterFormState,
  populateCoverLetterTab,
  generateCoverLetter,
  saveCoverLetter,
  _renderConsistencyReport,
  _debouncedValidateCL,
  _validateCoverLetter,
  _getCompanyNameForCL,
};
