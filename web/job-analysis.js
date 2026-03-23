// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/job-analysis.js
 * Job analysis orchestration: fires analyze_job action, merges post-analysis
 * questions, and transitions the UI to the analysis tab.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - isLoading, tabData (state globals)
 *   - llmFetch, setLoading (fetch-utils.js)
 *   - appendLoadingMessage, removeLoadingMessage, appendMessage,
 *     appendRetryMessage, appendFormattedAnalysis (message-queue.js)
 *   - parseMessageResponse (validators.js)
 *   - askPostAnalysisQuestions (api-client.js)
 *   - refreshAtsScore (ats-refinement.js)
 *   - switchTab (review-table-base.js, Tier 4)
 *   - fetchStatus (app.js orchestrator, Tier 8)
 *   - _showIntakeConfirmCard (message-dispatch.js, Tier 3)
 */

import { getLogger } from './logger.js';
const log = getLogger('job-analysis');

import { stateManager } from './state-manager.js';

// ---------------------------------------------------------------------------
// Post-analysis question helpers
// ---------------------------------------------------------------------------

/** Normalise a raw questions array to [{question, type, choices}]. */
function normalizePostAnalysisQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .filter(q => q && typeof q.question === 'string' && q.question.trim())
    .map((q, idx) => ({
      question: q.question.trim(),
      type:     (q.type || `clarification_${idx + 1}`).toString(),
      choices:  Array.isArray(q.choices) ? q.choices : [],
    }));
}

/**
 * Extract numbered-list questions from unstructured assistant text.
 * Returns at most 4 questions.
 */
function extractStructuredQuestionsFromAssistantText(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/^\s*\d+\.\s+/m);
  if (blocks.length <= 1) return [];
  return blocks
    .slice(1)
    .map((block, idx) => {
      const question = block.trim();
      if (!question) return null;
      return { question: question.slice(0, 4000), type: `clarification_${idx + 1}`, choices: [] };
    })
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * Merge server-provided questions with those extracted from the assistant text,
 * de-duplicating by question text and type.
 */
function mergePostAnalysisQuestions(existingQuestions, incomingQuestions) {
  const existing = normalizePostAnalysisQuestions(existingQuestions);
  const incoming = normalizePostAnalysisQuestions(incomingQuestions);

  const merged        = [...existing];
  const seenByQuestion = new Set(existing.map(q => q.question.toLowerCase().replace(/\s+/g, ' ').trim()));
  const usedTypes      = new Set(existing.map(q => q.type));

  incoming.forEach((q, idx) => {
    const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seenByQuestion.has(key)) return;
    let type = q.type || `clarification_${merged.length + idx + 1}`;
    if (usedTypes.has(type)) type = `${type}_${merged.length + idx + 1}`;
    merged.push({ question: q.question, type, choices: Array.isArray(q.choices) ? q.choices : [] });
    seenByQuestion.add(key);
    usedTypes.add(type);
  });

  return merged;
}

// ---------------------------------------------------------------------------
// analyzeJob
// ---------------------------------------------------------------------------

async function analyzeJob() {
  if (stateManager.isLoading()) return;

  // Gate on intake confirmation before first analysis.
  if (!stateManager.getTabData('analysis')) {
    try {
      const res  = await llmFetch('/api/intake-metadata');
      const data = await res.json();
      if (!data.confirmed) {
        await _showIntakeConfirmCard();
        return;
      }
    } catch (_e) { /* network error — proceed without gate */ }
  }

  const loadingMsg = appendLoadingMessage('Analyzing job description...');
  setLoading(true, 'Analysing job description…');

  try {
    const res  = await llmFetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze_job' }),
    });
    const data = parseMessageResponse(await res.json());

    removeLoadingMessage(loadingMsg);

    if (data.error) {
      appendRetryMessage('❌ Error: ' + data.error, analyzeJob);
    } else {
      const result       = data.result;
      const analysisText = typeof result === 'string' ? result : (result?.text) || null;
      const analysisData = typeof result === 'object' && result !== null
        ? (result.context_data?.job_analysis ?? result)
        : result;
      const structuredQuestions = mergePostAnalysisQuestions(
        (typeof result === 'object' && result !== null) ? result.context_data?.post_analysis_questions : null,
        extractStructuredQuestionsFromAssistantText(analysisText),
      );

      if (analysisText) appendMessage('assistant', analysisText);
      appendFormattedAnalysis(analysisData);
      stateManager.setTabData('analysis', analysisData);
      refreshAtsScore('analysis');
      switchTab('analysis');

      await askPostAnalysisQuestions(analysisData, structuredQuestions);
    }
  } catch (error) {
    log.error('=== ANALYZE JOB ERROR ===', error);
    removeLoadingMessage(loadingMsg);
    if (error.name !== 'AbortError') {
      appendRetryMessage('❌ Error: ' + error.message, analyzeJob);
    }
  }

  setLoading(false);
  await fetchStatus();
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  normalizePostAnalysisQuestions,
  extractStructuredQuestionsFromAssistantText,
  mergePostAnalysisQuestions,
  analyzeJob,
};
