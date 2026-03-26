// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * state-manager.js
 * Manages session state, localStorage persistence, and state initialization.
 * Centralizes all state management logic (currentTab, interactiveState, sessionId, etc.)
 */

import { getLogger } from './logger.js';
const log = getLogger('state-manager');

import { StorageKeys } from './api-client.js';

/**
 * Mirror of the Python Phase enum in scripts/utils/conversation_manager.py.
 * Python is the SOURCE OF TRUTH — update both files together whenever adding
 * or renaming a phase.
 */
const PHASES = {
  INIT:           'init',
  JOB_ANALYSIS:   'job_analysis',
  CUSTOMIZATION:  'customization',
  REWRITE_REVIEW: 'rewrite_review',
  SPELL_CHECK:    'spell_check',
  GENERATION:     'generation',
  LAYOUT_REVIEW:  'layout_review',
  REFINEMENT:     'refinement',
};

const PHASE_TO_STEP = {
  [PHASES.INIT]:           'job',
  [PHASES.JOB_ANALYSIS]:   'analysis',
  [PHASES.CUSTOMIZATION]:  'customizations',
  [PHASES.REWRITE_REVIEW]: 'rewrite',
  [PHASES.SPELL_CHECK]:    'spell',
  [PHASES.GENERATION]:     'generate',
  [PHASES.LAYOUT_REVIEW]:  'layout',
  [PHASES.REFINEMENT]:     'finalise',
};

function getWorkflowStepForPhase(phase) {
  return PHASE_TO_STEP[phase] || 'job';
}

/**
 * Staged generation workflow phases (GAP-20 implementation).
 * These track the preview/layout review → confirmed → final pipeline
 * independently of the main conversation PHASES above.
 * Backend source of truth is session_data['generation_state']['phase'].
 */
const GENERATION_PHASES = {
  IDLE:           'idle',
  LAYOUT_REVIEW:  'layout_review',
  CONFIRMED:      'confirmed',
  FINAL_COMPLETE: 'final_complete',
};

const GENERATION_STATE_EVENT = 'cvbuilder:generation-state-changed';

function createDefaultGenerationState() {
  return {
    phase: GENERATION_PHASES.IDLE,
    previewAvailable: false,
    previewOutputs: null,
    layoutConfirmed: false,
    pageCountEstimate: null,
    pageCountExact: null,
    pageCountConfidence: null,
    pageCountSource: null,
    pageNeedsExactRecheck: false,
    pageWarning: false,
    layoutInstructionsCount: 0,
    finalGeneratedAt: null,
    contentRevision: 0,
    lastPreviewContentRevision: null,
    lastFinalContentRevision: null,
  };
}

function normalizeRevision(value) {
  return Number.isFinite(value) ? value : null;
}

function getLastRenderedContentRevision(state) {
  const revisions = [
    normalizeRevision(state.lastPreviewContentRevision),
    normalizeRevision(state.lastFinalContentRevision),
  ].filter(value => value !== null);
  return revisions.length > 0 ? Math.max(...revisions) : null;
}

function generateSessionId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `session-${cryptoApi.randomUUID()}`;
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `session-${token}`;
  }

  log.warn('Web Crypto API unavailable; falling back to timestamp-plus-random session id generation.');
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function getLayoutFreshnessFromState(state) {
  const previewAvailable = Boolean(state.previewAvailable);
  const hasFinalOutputs = Boolean(
    state.finalGeneratedAt
      || state.phase === GENERATION_PHASES.FINAL_COMPLETE
      || normalizeRevision(state.lastFinalContentRevision) !== null
  );

  if (!previewAvailable) {
    return {
      showChip: false,
      isStale: false,
      isCritical: false,
      hasFinalOutputs,
      label: '',
      ariaLabel: '',
      tone: 'hidden',
    };
  }

  const contentRevision = normalizeRevision(state.contentRevision) ?? 0;
  const lastRenderedRevision = getLastRenderedContentRevision(state);
  const isStale = lastRenderedRevision !== null && contentRevision > lastRenderedRevision;
  const isCritical = isStale && hasFinalOutputs;

  if (isCritical) {
    return {
      showChip: true,
      isStale,
      isCritical,
      hasFinalOutputs,
      label: 'Files outdated',
      ariaLabel: 'Files outdated. Activate to review layout and regenerate outputs.',
      tone: 'critical',
    };
  }

  if (isStale) {
    return {
      showChip: true,
      isStale,
      isCritical,
      hasFinalOutputs,
      label: 'Layout outdated',
      ariaLabel: 'Layout outdated. Activate to review and regenerate preview.',
      tone: 'stale',
    };
  }

  return {
    showChip: true,
    isStale,
    isCritical,
    hasFinalOutputs,
    label: 'Layout current',
    ariaLabel: 'Layout current. Preview matches latest content.',
    tone: 'fresh',
  };
}

function emitGenerationStateChanged() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new CustomEvent(GENERATION_STATE_EVENT, {
    detail: {
      generationState: { ...generationState },
      layoutFreshness: getLayoutFreshnessFromState(generationState),
    },
  }));
}

// Global state variables (moved into module for clarity)
let currentTab = 'job';
let isLoading = false;
globalThis.isLoading = isLoading;
let tabData = {
  analysis: null,
  customizations: null,
  cv: null
};
let interactiveState = {
  isReviewing: false,
  currentIndex: 0,
  type: null, // 'experiences' or 'skills'
  data: null
};
let sessionId = null;
let lastKnownPhase = PHASES.INIT;
let isReconnecting = false;
// Current model/provider selection (persisted to localStorage)
let currentModelProvider = null;
let currentModelName = null;

function installLegacyStateGlobals() {
  const bindings = {
    isLoading: {
      get: () => isLoading,
      set: (value) => { isLoading = Boolean(value); },
    },
    tabData: {
      get: () => tabData,
      set: (value) => {
        tabData = value && typeof value === 'object'
          ? value
          : { analysis: null, customizations: null, cv: null };
      },
    },
    currentTab: {
      get: () => currentTab,
      set: (value) => { currentTab = value; },
    },
    currentStage: {
      get: () => getWorkflowStepForPhase(lastKnownPhase),
      set: () => {},
    },
    interactiveState: {
      get: () => interactiveState,
      set: (value) => {
        if (value && typeof value === 'object') {
          interactiveState = value;
        }
      },
    },
    sessionId: {
      get: () => sessionId,
      set: (value) => { sessionId = value; },
    },
    lastKnownPhase: {
      get: () => lastKnownPhase,
      set: (value) => { lastKnownPhase = value; },
    },
    isReconnecting: {
      get: () => isReconnecting,
      set: (value) => { isReconnecting = Boolean(value); },
    },
  };

  Object.entries(bindings).forEach(([name, descriptor]) => {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      enumerable: true,
      get: descriptor.get,
      set: descriptor.set,
    });
  });
}

installLegacyStateGlobals();

// Staged generation state (GAP-20): tracks preview → confirm → final pipeline.
// Synced from /api/cv/generation-state on page load and after key transitions.
let generationState = createDefaultGenerationState();

// ATS score state (GAP-21): cached score from /api/cv/ats-score.
// Null until first score is fetched.
let atsScore = null;

// Export state getters/setters
const stateManager = {
  // Tab state
  getCurrentTab: () => currentTab,
  setCurrentTab: (tab) => { currentTab = tab; saveStateToLocalStorage(); },
  getCurrentStage: () => getWorkflowStepForPhase(lastKnownPhase),

  // Loading state
  isLoading: () => isLoading,
  setLoading: (loading) => {
    isLoading = loading;
    globalThis.isLoading = loading;
  },

  // Tab data (analysis, customizations, CV)
  getTabData: (tab) => tabData[tab],
  getAllTabData: () => ({ ...tabData }),
  setTabData: (tab, data) => { tabData[tab] = data; saveStateToLocalStorage(); },

  // Interactive state (for experience/skill selection review)
  getInteractiveState: () => interactiveState,
  setInteractiveState: (state) => { interactiveState = { ...interactiveState, ...state }; saveStateToLocalStorage(); },

  // Reconnect state
  isReconnecting: () => isReconnecting,
  setIsReconnecting: (reconnecting) => { isReconnecting = Boolean(reconnecting); },

  // Session management
  getSessionId: () => sessionId,
  setSessionId: (id) => { sessionId = id; localStorage.setItem(StorageKeys.SESSION_ID, id); },

  // Model/provider selection
  getCurrentModelProvider: () => currentModelProvider,
  getCurrentModelName: () => currentModelName,
  setCurrentModel: (provider, model) => { currentModelProvider = provider || null; currentModelName = model || null; saveStateToLocalStorage(); },

  // Phase tracking
  getPhase: () => lastKnownPhase,
  setPhase: (phase) => { lastKnownPhase = phase; saveStateToLocalStorage(); },
  getWorkflowStep: () => getWorkflowStepForPhase(lastKnownPhase),

  // Post-analysis questions
  getPostAnalysisQuestions: () => window.postAnalysisQuestions || [],
  setPostAnalysisQuestions: (questions) => { window.postAnalysisQuestions = questions; },

  // Question answers
  getQuestionAnswers: () => window.questionAnswers || {},
  setQuestionAnswers: (answers) => { window.questionAnswers = answers; },

  // Pending recommendations
  getPendingRecommendations: () => window.pendingRecommendations || null,
  setPendingRecommendations: (rec) => { window.pendingRecommendations = rec; saveStateToLocalStorage(); },

  // ATS score state (GAP-21)
  getAtsScore: () => atsScore,
  setAtsScore: (score) => { atsScore = score; saveStateToLocalStorage(); },
  clearAtsScore: () => { atsScore = null; saveStateToLocalStorage(); },

  // Staged generation state (GAP-20)
  getGenerationState: () => generationState,
  getLayoutFreshness: () => getLayoutFreshnessFromState(generationState),
  setGenerationState: (update) => {
    generationState = { ...generationState, ...update };
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
  markContentChanged: () => {
    generationState = {
      ...generationState,
      contentRevision: (normalizeRevision(generationState.contentRevision) ?? 0) + 1,
    };
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
  markPreviewGenerated: (update = {}) => {
    const contentRevision = normalizeRevision(generationState.contentRevision) ?? 0;
    generationState = {
      ...generationState,
      ...update,
      phase: GENERATION_PHASES.LAYOUT_REVIEW,
      previewAvailable: true,
      layoutConfirmed: false,
      lastPreviewContentRevision: contentRevision,
    };
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
  markLayoutConfirmed: (update = {}) => {
    generationState = {
      ...generationState,
      ...update,
      phase: GENERATION_PHASES.CONFIRMED,
      layoutConfirmed: true,
    };
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
  markFinalGenerated: (generatedAt = null, update = {}) => {
    const contentRevision = normalizeRevision(generationState.contentRevision) ?? 0;
    generationState = {
      ...generationState,
      ...update,
      phase: GENERATION_PHASES.FINAL_COMPLETE,
      layoutConfirmed: true,
      finalGeneratedAt: generatedAt || update.finalGeneratedAt || new Date().toISOString(),
      lastFinalContentRevision: contentRevision,
    };
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
  resetGenerationState: () => {
    generationState = createDefaultGenerationState();
    saveStateToLocalStorage();
    emitGenerationStateChanged();
  },
};

/**
 * Initialize fresh state object with all default values.
 */
function initializeState() {
  currentTab = 'job';
  isLoading = false;
  globalThis.isLoading = false;
  tabData = {
    analysis: null,
    customizations: null,
    cv: null
  };
  interactiveState = {
    isReviewing: false,
    currentIndex: 0,
    type: null,
    data: null
  };
  window.postAnalysisQuestions = [];
  window.questionAnswers = {};
  lastKnownPhase = PHASES.INIT;
  generationState = createDefaultGenerationState();

  // Get or generate session ID
  let storedId = localStorage.getItem(StorageKeys.SESSION_ID);
  if (!storedId) {
    storedId = generateSessionId();
    localStorage.setItem(StorageKeys.SESSION_ID, storedId);
  }
  sessionId = storedId;

  saveStateToLocalStorage();
  emitGenerationStateChanged();
}

/**
 * Load state from browser localStorage.
 */
function loadStateFromLocalStorage() {
  try {
    const saved = localStorage.getItem(StorageKeys.TAB_DATA);
    if (!saved) return false;

    const data = JSON.parse(saved);

    // Only restore if data is recent (within 24 hours)
    const age = Date.now() - (data.timestamp || 0);
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(StorageKeys.TAB_DATA);
      return false;
    }

    // Restore tab data
    if (data.tabData) {
      tabData = { ...tabData, ...data.tabData };
    }

    if (data.currentTab) {
      currentTab = data.currentTab;
    }

    // Restore interactive state
    if (data.interactiveState) {
      interactiveState = { ...interactiveState, ...data.interactiveState };
    }

    // Restore pending recommendations
    if (data.pendingRecommendations) {
      window.pendingRecommendations = data.pendingRecommendations;
    }

    // Restore saved model/provider selection
    if (data.currentModelProvider) {
      currentModelProvider = data.currentModelProvider;
    }
    if (data.currentModelName) {
      currentModelName = data.currentModelName;
    }

    // Restore post-analysis state
    if (data.postAnalysisQuestions) {
      window.postAnalysisQuestions = data.postAnalysisQuestions;
    }
    if (data.questionAnswers) {
      window.questionAnswers = data.questionAnswers;
    }

    // Restore phase
    if (data.lastKnownPhase) {
      lastKnownPhase = data.lastKnownPhase;
    }

    // Restore staged generation state
    if (data.generationState) {
      generationState = { ...generationState, ...data.generationState };
    }

    // Restore ATS score
    if (data.atsScore) {
      atsScore = data.atsScore;
    }

    emitGenerationStateChanged();
    return true;
  } catch (error) {
    log.warn('Failed to load state from localStorage:', error);
    return false;
  }
}

/**
 * Save current state to browser localStorage.
 */
function saveStateToLocalStorage() {
  try {
    const dataToSave = {
      timestamp: Date.now(),
      tabData,
      interactiveState,
      pendingRecommendations: window.pendingRecommendations,
      postAnalysisQuestions: window.postAnalysisQuestions,
      questionAnswers: window.questionAnswers,
      lastKnownPhase,
      currentTab,
      // Persist last-selected model/provider so UI selections survive reloads
      currentModelProvider,
      currentModelName,
      generationState,
      atsScore,
    };

    localStorage.setItem(StorageKeys.TAB_DATA, JSON.stringify(dataToSave));
  } catch (error) {
    log.warn('Failed to save state to localStorage:', error);
  }
}

/**
 * Clear all state (on new session or reset action).
 */
function clearState() {
  initializeState();
  Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
}

// The authoritative restoreSession/restoreBackendState/loadSessionFile
// implementations live in `web/app.js`. Remove duplicate implementations
// from this module to avoid conflicting behavior and ensure a single
// restore path is used by the application.

export {
  PHASES,
  PHASE_TO_STEP,
  GENERATION_PHASES,
  GENERATION_STATE_EVENT,
  stateManager,
  getWorkflowStepForPhase,
  initializeState, loadStateFromLocalStorage, saveStateToLocalStorage,
  clearState,
};
