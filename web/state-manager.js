/**
 * state-manager.js
 * Manages session state, localStorage persistence, and state initialization.
 * Centralizes all state management logic (currentTab, interactiveState, sessionId, etc.)
 */

// StorageKeys is defined in api-client.js (loaded before this file)

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

// Global state variables (moved into module for clarity)
let currentTab = 'job';
let isLoading = false;
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

// Export state getters/setters
const stateManager = {
  // Tab state
  getCurrentTab: () => currentTab,
  setCurrentTab: (tab) => { currentTab = tab; saveStateToLocalStorage(); },

  // Loading state
  isLoading: () => isLoading,
  setLoading: (loading) => { isLoading = loading; },

  // Tab data (analysis, customizations, CV)
  getTabData: (tab) => tabData[tab],
  setTabData: (tab, data) => { tabData[tab] = data; saveStateToLocalStorage(); },

  // Interactive state (for experience/skill selection review)
  getInteractiveState: () => interactiveState,
  setInteractiveState: (state) => { interactiveState = { ...interactiveState, ...state }; saveStateToLocalStorage(); },

  // Session management
  getSessionId: () => sessionId,
  setSessionId: (id) => { sessionId = id; localStorage.setItem(StorageKeys.SESSION_ID, id); },

  // Phase tracking
  getPhase: () => lastKnownPhase,
  setPhase: (phase) => { lastKnownPhase = phase; saveStateToLocalStorage(); },

  // Post-analysis questions
  getPostAnalysisQuestions: () => window.postAnalysisQuestions || [],
  setPostAnalysisQuestions: (questions) => { window.postAnalysisQuestions = questions; },

  // Question answers
  getQuestionAnswers: () => window.questionAnswers || {},
  setQuestionAnswers: (answers) => { window.questionAnswers = answers; },

  // Pending recommendations
  getPendingRecommendations: () => window.pendingRecommendations || null,
  setPendingRecommendations: (rec) => { window.pendingRecommendations = rec; saveStateToLocalStorage(); }
};

/**
 * Initialize fresh state object with all default values.
 */
function initializeState() {
  currentTab = 'job';
  isLoading = false;
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

    // Restore interactive state
    if (data.interactiveState) {
      interactiveState = { ...interactiveState, ...data.interactiveState };
    }

    // Restore pending recommendations
    if (data.pendingRecommendations) {
      window.pendingRecommendations = data.pendingRecommendations;
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

    return true;
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
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
      currentTab
    };

    localStorage.setItem(StorageKeys.TAB_DATA, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
}

/**
 * Clear all state (on new session or reset action).
 */
function clearState() {
  initializeState();
  Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
}

/**
 * Restore session from backend and localStorage.
 * Called on page load to resume prior work.
 */
async function restoreSession() {
  try {
    isReconnecting = true;

    // Try to get session ID from localStorage
    const storedSessionId = localStorage.getItem(StorageKeys.SESSION_ID);
    if (storedSessionId) {
      sessionId = storedSessionId;
    } else {
      // Generate new session ID
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(StorageKeys.SESSION_ID, sessionId);
    }

    // Try to restore conversation history from backend using apiCall
    const historyData = await apiCall('GET', '/api/history');

    if (historyData) {
      // Only restore from backend if localStorage doesn't have recent history
      const hasLocalHistory = loadStateFromLocalStorage();

      if (!hasLocalHistory && historyData.history && historyData.history.length > 0) {
        const conversation = document.getElementById('conversation');
        if (conversation) {
          conversation.innerHTML = ''; // Clear loading messages

          historyData.history.forEach(msg => {
            if (msg.role === 'user') {
              appendMessage('user', msg.content);
            } else if (msg.role === 'assistant') {
              appendMessage('assistant', msg.content);
            } else if (msg.role === 'system') {
              appendMessage('system', msg.content);
            }
          });

          appendMessage('system', '🔄 Session restored. You can continue where you left off.');
        }
      }

      // Update phase
      if (historyData.phase) {
        lastKnownPhase = historyData.phase;
      }
    }

    // Try to restore backend state
    await restoreBackendState();

    isReconnecting = false;
  } catch (error) {
    console.warn('Session restoration failed:', error);
    if (document.getElementById('conversation')) {
      appendMessage('system', `⚠️ Could not restore previous session. Starting fresh. (${error.message})`);
    }
    isReconnecting = false;
  }
}

/**
 * Restore backend state (analysis, customizations, CV files).
 * Called during session restoration.
 */
async function restoreBackendState() {
  try {
    const statusData = await apiCall('GET', '/api/status');

    if (statusData) {
      // If we have job analysis data, try to restore it
      if (statusData.phase === PHASES.CUSTOMIZATION || statusData.phase === PHASES.REWRITE_REVIEW || statusData.phase === PHASES.SPELL_CHECK || statusData.phase === PHASES.GENERATION || statusData.phase === PHASES.LAYOUT_REVIEW || statusData.phase === PHASES.REFINEMENT) {
        const analysisData = statusData.job_analysis;
        if (analysisData) {
          tabData.analysis = analysisData;
          if (currentTab === 'analysis') {
            populateAnalysisTab(analysisData);
          }
        }
      }

      // If we have customization data, try to restore it
      if (statusData.phase === PHASES.REWRITE_REVIEW || statusData.phase === PHASES.SPELL_CHECK || statusData.phase === PHASES.GENERATION || statusData.phase === PHASES.LAYOUT_REVIEW || statusData.phase === PHASES.REFINEMENT) {
        const customizationData = statusData.customizations;
        if (customizationData) {
          tabData.customizations = customizationData;
          window.pendingRecommendations = customizationData;
          if (currentTab === 'customizations') {
            await populateCustomizationsTabWithReview(customizationData);
          }
        }
      }

      // If we have generated CV, try to restore it
      if ((statusData.phase === PHASES.LAYOUT_REVIEW || statusData.phase === PHASES.REFINEMENT) && statusData.generated_files) {
        tabData.cv = statusData.generated_files;
        if (currentTab === 'cv') {
          populateCVTab(statusData.generated_files);
        } else if (currentTab === 'download') {
          await populateDownloadTab(statusData.generated_files);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to restore backend state:', error);
  }
}

/**
 * Load session from a specific file path (used for loading prior sessions).
 */
async function loadSessionFile(path) {
  try {
    const res = await fetch('/api/load-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });

    if (res.ok) {
      const sessionData = await res.json();
      return sessionData;
    }
  } catch (error) {
    console.error('Failed to load session file:', error);
  }
  return null;
}

// CJS export shim — no-op in browsers (module is undefined)
if (typeof module !== 'undefined') {
  module.exports = {
    PHASES,
    stateManager,
    initializeState, loadStateFromLocalStorage, saveStateToLocalStorage,
    clearState, restoreSession, restoreBackendState, loadSessionFile,
  };
}
