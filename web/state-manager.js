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
 * These track the preview → layout-review → confirmed → final pipeline
 * independently of the main conversation PHASES above.
 * Backend source of truth is session_data['generation_state']['phase'].
 */
const GENERATION_PHASES = {
  IDLE:           'idle',           // No preview generated yet
  PREVIEW:        'preview',        // HTML preview generated; in layout review
  CONFIRMED:      'confirmed',      // Layout confirmed; awaiting final outputs
  FINAL_COMPLETE: 'final_complete', // Final PDF/DOCX produced
};

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
let generationState = {
  phase: GENERATION_PHASES.IDLE,
  previewAvailable: false,
  layoutConfirmed: false,
  pageCountEstimate: null,
  pageWarning: false,
  layoutInstructionsCount: 0,
};

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
  setGenerationState: (update) => {
    generationState = { ...generationState, ...update };
    saveStateToLocalStorage();
  },
  resetGenerationState: () => {
    generationState = {
      phase: GENERATION_PHASES.IDLE,
      previewAvailable: false,
      layoutConfirmed: false,
      pageCountEstimate: null,
      pageWarning: false,
      layoutInstructionsCount: 0,
    };
    saveStateToLocalStorage();
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
  generationState = {
    phase: GENERATION_PHASES.IDLE,
    previewAvailable: false,
    layoutConfirmed: false,
    pageCountEstimate: null,
    pageWarning: false,
    layoutInstructionsCount: 0,
  };

  // Get or generate session ID
  let storedId = localStorage.getItem(StorageKeys.SESSION_ID);
  if (!storedId) {
    storedId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(StorageKeys.SESSION_ID, storedId);
  }
  sessionId = storedId;

  saveStateToLocalStorage();
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
  stateManager,
  getWorkflowStepForPhase,
  initializeState, loadStateFromLocalStorage, saveStateToLocalStorage,
  clearState,
};
