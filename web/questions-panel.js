/**
 * web/questions-panel.js
 * Post-analysis clarifying questions panel: render, draft, submit.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - cleanJsonResponse (utils.js)
 *   - mergePostAnalysisQuestions, normalizePostAnalysisQuestions (job-analysis.js)
 *   - buildFallbackPostAnalysisQuestions (recommendation-helpers.js)
 *   - appendMessage (message-queue.js)
 *   - sendAction (session-actions.js)
 *   - escapeHtml (utils.js)
 *   - switchTab (review-table-base.js, Tier 4)
 *   - tabData, postAnalysisQuestions, questionAnswers (window globals)
 */

// ---------------------------------------------------------------------------
// State persistence helpers
// ---------------------------------------------------------------------------

async function persistPostAnalysisState() {
  try {
    if (!Array.isArray(window.postAnalysisQuestions)) {
      window.postAnalysisQuestions = [];
    }
    if (!window.questionAnswers || typeof window.questionAnswers !== 'object') {
      window.questionAnswers = {};
    }

    await fetch('/api/post-analysis-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: window.postAnalysisQuestions,
        answers: window.questionAnswers
      })
    });
  } catch (error) {
    console.warn('Failed to persist post-analysis state:', error);
  }
}

// ---------------------------------------------------------------------------
// Markdown renderer for question text
// ---------------------------------------------------------------------------

function renderQuestionMarkdown(markdownText) {
  const safe = escapeHtml(markdownText || '');
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// API fetch for questions
// ---------------------------------------------------------------------------

async function fetchPostAnalysisQuestionsFromApi(analysisData) {
  try {
    const res = await fetch('/api/post-analysis-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: analysisData })
    });
    if (!res.ok) return [];
    const payload = await res.json();
    return normalizePostAnalysisQuestions(payload.questions);
  } catch (apiError) {
    console.warn('Failed to fetch post-analysis questions:', apiError);
    return [];
  }
}

async function appendFollowUpPostAnalysisQuestions() {
  if (!tabData.analysis) return 0;

  let analysisData;
  try {
    const cleanAnalysis = cleanJsonResponse(tabData.analysis);
    analysisData = typeof cleanAnalysis === 'string'
      ? JSON.parse(cleanAnalysis)
      : cleanAnalysis;
  } catch (parseError) {
    console.warn('Skipping follow-up questions due to invalid analysis payload:', parseError);
    return 0;
  }

  const followUps = await fetchPostAnalysisQuestionsFromApi(analysisData);
  if (followUps.length === 0) return 0;

  const beforeCount = Array.isArray(window.postAnalysisQuestions)
    ? window.postAnalysisQuestions.length
    : 0;

  window.postAnalysisQuestions = mergePostAnalysisQuestions(
    window.postAnalysisQuestions,
    followUps
  );

  const added = window.postAnalysisQuestions.length - beforeCount;
  if (added > 0) {
    await persistPostAnalysisState();
  }
  return added;
}

// ---------------------------------------------------------------------------
// Main orchestrator: called after analyzeJob completes
// ---------------------------------------------------------------------------

async function askPostAnalysisQuestions(analysisResult, preferredQuestions = null) {
  try {
    const cleanResult = cleanJsonResponse(analysisResult);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;

    window.postAnalysisQuestions = mergePostAnalysisQuestions([], preferredQuestions);

    if (window.postAnalysisQuestions.length === 0) {
      window.postAnalysisQuestions = await fetchPostAnalysisQuestionsFromApi(data);
    }

    if (window.postAnalysisQuestions.length === 0) {
      window.postAnalysisQuestions = buildFallbackPostAnalysisQuestions(data);
    }

    if (!window.questionAnswers || typeof window.questionAnswers !== 'object') {
      window.questionAnswers = {};
    }
    await persistPostAnalysisState();

    if (window.postAnalysisQuestions.length > 0) {
      renderQuestionsPanel();
      switchTab('questions');
    } else {
      appendMessage('assistant', 'Analysis complete! No clarifying questions needed. Generating customization recommendations…');
      await sendAction('recommend_customizations');
    }
  } catch (e) {
    console.error('Error parsing analysis for questions:', e);
    appendMessage('assistant', 'Analysis complete! Click "Recommend Customizations" when ready.');
  }
}

// ---------------------------------------------------------------------------
// Tab population
// ---------------------------------------------------------------------------

function populateQuestionsTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  if (!tabData.analysis) {
    content.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>No Questions Yet</h3><p>Run "Analyze Job" first to generate clarifying questions.</p></div>';
    return;
  }

  const hasQuestions = Array.isArray(window.postAnalysisQuestions) && window.postAnalysisQuestions.length > 0;
  if (!hasQuestions) {
    content.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>Questions Complete</h3><p>No pending clarifying questions — customization recommendations will be generated automatically.</p></div>';
    return;
  }

  content.innerHTML = '<div class="analysis-page"><div class="analysis-section"><h2>💬 Clarifying Questions</h2><p style="color:#64748b; margin: 0;">Please answer each question to improve recommendation quality.</p></div></div>';
  renderQuestionsPanel();
}

// ---------------------------------------------------------------------------
// Panel renderer
// ---------------------------------------------------------------------------

function renderQuestionsPanel() {
  const qs = window.postAnalysisQuestions || [];
  if (qs.length === 0) return;

  const content = document.getElementById('document-content');
  if (!content) return;

  const existing = content.querySelector('.questions-panel');
  if (existing) existing.remove();

  const total = qs.length;
  const existingAnswers = (window.questionAnswers && typeof window.questionAnswers === 'object')
    ? window.questionAnswers
    : {};
  let panelHtml = `<div class="questions-panel" id="questions-panel">
    <h2>💬 A few quick questions</h2>
    <p class="q-progress" id="q-progress">Please answer all ${total} question${total > 1 ? 's' : ''} before proceeding.</p>`;

  qs.forEach((q, idx) => {
    const savedAnswer = (existingAnswers[q.type] || '').toString();
    const isAnswered  = savedAnswer.trim().length > 0;
    const renderedQuestion = renderQuestionMarkdown(q.question);
    const chips = (q.choices || []).map((c, ci) =>
      `<button class="q-chip" data-qidx="${idx}" data-cidx="${ci}" onclick="selectQChip(this, ${idx})">${escapeHtml(c)}</button>`
    ).join('');
    panelHtml += `
      <div class="question-item${isAnswered ? ' answered' : ''}" id="q-item-${idx}">
        <div class="q-header">
          <div class="q-text">${idx + 1}. ${renderedQuestion}</div>
          ${isAnswered ? '<span class="q-answered-badge">✓ Answered</span>' : ''}
        </div>
        ${chips ? `<div class="q-chips">${chips}</div>` : ''}
        <div class="q-answer-row">
          <textarea class="q-input" id="q-input-${idx}" placeholder="Your answer…" oninput="updateQProgress()">${escapeHtml(savedAnswer)}</textarea>
          <button class="q-draft-btn" id="q-draft-btn-${idx}" onclick="draftQuestionResponse(${idx})" title="Generate a draft answer using AI">✨ Draft</button>
        </div>
      </div>`;
  });

  panelHtml += `<button class="questions-submit-btn" id="q-submit-btn" onclick="submitAllAnswers()" disabled>Submit Answers</button></div>`;

  content.insertAdjacentHTML('beforeend', panelHtml);

  // Restore chip selection for any question whose saved answer matches a chip label.
  qs.forEach((q, idx) => {
    const saved = (existingAnswers[q.type] || '').toString().trim();
    if (!saved) return;
    const item = document.getElementById(`q-item-${idx}`);
    if (!item) return;
    item.querySelectorAll('.q-chip').forEach(chip => {
      if ((chip.textContent || '').trim() === saved) {
        chip.classList.add('selected');
      }
    });
  });

  updateQProgress();
}

// ---------------------------------------------------------------------------
// Interaction handlers
// ---------------------------------------------------------------------------

async function draftQuestionResponse(idx) {
  const qs = window.postAnalysisQuestions || [];
  const q  = qs[idx];
  if (!q) return;

  const btn = document.getElementById(`q-draft-btn-${idx}`);
  const ta  = document.getElementById(`q-input-${idx}`);
  if (!btn || !ta) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="display:inline-block;width:11px;height:11px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;"></span>';

  try {
    let analysisPayload = null;
    if (tabData.analysis) {
      try {
        const cleaned = cleanJsonResponse(tabData.analysis);
        analysisPayload = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
      } catch (_) { /* use null */ }
    }

    const res = await fetch('/api/post-analysis-draft-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.question, question_type: q.type, analysis: analysisPayload }),
    });
    const data = await res.json();
    if (data.ok && data.text) {
      ta.value = data.text;
      updateQProgress();
      const item = document.getElementById(`q-item-${idx}`);
      if (item) item.querySelectorAll('.q-chip').forEach(c => c.classList.remove('selected'));
      showDraftError(idx, null);
      appendMessage('assistant', `✨ Draft answer for Q${idx + 1}:\n\n${data.text}\n\nReview and edit in the field below before submitting.`);
    } else {
      console.warn('Draft generation failed:', data.error);
      showDraftError(idx, data.error || 'Draft failed — please try again.');
    }
  } catch (err) {
    console.error('Draft fetch error:', err);
    showDraftError(idx, 'Network error — please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Draft';
  }
}

function selectQChip(btn, qIdx) {
  const panel = document.getElementById(`q-item-${qIdx}`);
  if (panel) {
    panel.querySelectorAll('.q-chip').forEach(c => c.classList.remove('selected'));
  }
  btn.classList.add('selected');
  const textarea = document.getElementById(`q-input-${qIdx}`);
  if (textarea) {
    textarea.value = btn.textContent;
    updateQProgress();
  }
}

function updateQProgress() {
  const qs = window.postAnalysisQuestions || [];
  const answered = qs.filter((_, idx) => {
    const ta = document.getElementById(`q-input-${idx}`);
    return ta && ta.value.trim().length > 0;
  }).length;
  const progressEl = document.getElementById('q-progress');
  if (progressEl) {
    progressEl.textContent = `Answered ${answered} of ${qs.length}`;
  }
  const submitBtn = document.getElementById('q-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = answered < qs.length;
  }
}

async function submitAllAnswers() {
  const qs = window.postAnalysisQuestions || [];
  qs.forEach((q, idx) => {
    const ta = document.getElementById(`q-input-${idx}`);
    if (ta && ta.value.trim()) {
      window.questionAnswers[q.type] = ta.value.trim();
    }
  });
  await persistPostAnalysisState();

  const btn = document.getElementById('q-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Processing…';
  }

  try {
    appendMessage('assistant', `✓ Thank you! ${qs.length} answer${qs.length > 1 ? 's' : ''} saved. Generating customization recommendations…`);
    await sendAction('recommend_customizations');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Submit Answers';
    }
  }
}

function showDraftError(idx, message) {
  const row = document.querySelector(`#q-item-${idx} .q-answer-row`);
  if (!row) return;
  let errEl = document.getElementById(`q-draft-err-${idx}`);
  if (!message) {
    if (errEl) errEl.remove();
    return;
  }
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = `q-draft-err-${idx}`;
    errEl.className = 'q-draft-error';
    row.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = `⚠ ${message}`;
}

// Legacy compatibility shim
function showNextQuestion() { renderQuestionsPanel(); }

function handleQuestionResponse(message) {
  if (!window.postAnalysisQuestions || window.postAnalysisQuestions.length === 0) return false;
  if (!window.waitingForQuestionResponse) return false;
  const idx = window.currentQuestionIndex || 0;
  const q = window.postAnalysisQuestions[idx];
  if (!q) return false;
  window.questionAnswers[q.type] = message;
  window.waitingForQuestionResponse = false;
  window.currentQuestionIndex = idx + 1;
  persistPostAnalysisState();
  renderQuestionsPanel();
  return true;
}

function finishPostAnalysisQuestions() {
  window.waitingForQuestionResponse = false;
  appendMessage('assistant', 'Thank you for those insights! Click "Recommend Customizations" when you\'re ready.');
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  persistPostAnalysisState,
  renderQuestionMarkdown,
  fetchPostAnalysisQuestionsFromApi,
  appendFollowUpPostAnalysisQuestions,
  askPostAnalysisQuestions,
  populateQuestionsTab,
  renderQuestionsPanel,
  draftQuestionResponse,
  selectQChip,
  updateQProgress,
  submitAllAnswers,
  showDraftError,
  showNextQuestion,
  handleQuestionResponse,
  finishPostAnalysisQuestions,
};
