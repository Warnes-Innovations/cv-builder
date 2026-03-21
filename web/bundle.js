/* cv-builder bundle — built by esbuild, do not edit directly */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // web/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    capitalizeWords: () => capitalizeWords,
    cleanJsonResponse: () => cleanJsonResponse,
    escapeHtml: () => escapeHtml,
    extractTitleAndCompanyFromJobText: () => extractTitleAndCompanyFromJobText,
    fmtDate: () => fmtDate,
    formatDuration: () => formatDuration,
    formatSessionPhaseLabel: () => formatSessionPhaseLabel,
    formatSessionTimestamp: () => formatSessionTimestamp,
    normalizePositionLabel: () => normalizePositionLabel,
    normalizeText: () => normalizeText,
    ordinal: () => ordinal,
    pluralize: () => pluralize,
    stripHtml: () => stripHtml,
    truncateText: () => truncateText
  });
  function normalizeText(text) {
    return text.trim().replace(/\s+/g, " ").trim();
  }
  function fmtDate(ts) {
    const date = new Date(ts * 1e3);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function cleanJsonResponse(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    return cleaned.trim();
  }
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
  function extractTitleAndCompanyFromJobText(jobText) {
    const lines = jobText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    for (const line of lines) {
      if (line.includes("|")) {
        const [title, company] = line.split("|").map((s) => s.trim());
        if (title && company) {
          return { title, company };
        }
      }
      if (line.toLowerCase().includes(" at ")) {
        const [title, company] = line.split(/\s+at\s+/i).map((s) => s.trim());
        if (title && company) {
          return { title, company };
        }
      }
    }
    const titleLine = lines[0];
    return {
      title: titleLine || "Untitled Position",
      company: lines.find((l) => l.toLowerCase() !== titleLine.toLowerCase()) || "Unknown Company"
    };
  }
  function normalizePositionLabel(title, company) {
    let normalized = title.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    normalized = normalized.replace(/\s+(role|position|title|job)\s*$/i, "").trim();
    return normalized || "Professional Role";
  }
  function stripHtml(html) {
    return html.replace(/<[^>]*>/g, "");
  }
  function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    let truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > Math.floor(maxLength * 0.75)) {
      truncated = truncated.substring(0, lastSpace);
    }
    return truncated + "\u2026";
  }
  function capitalizeWords(text) {
    return text.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  }
  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }
  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function formatSessionPhaseLabel(phase) {
    const SESSION_PHASE_LABELS = {
      init: "init",
      job_analysis: "analysis",
      customization: "customization",
      rewrite_review: "rewrite",
      spell_check: "spell check",
      generation: "generation",
      layout_review: "layout review",
      refinement: "finalise"
    };
    if (!phase) return "init";
    return SESSION_PHASE_LABELS[phase] || String(phase).replace(/_/g, " ");
  }
  function formatSessionTimestamp(timestamp, { includeTime = true } = {}) {
    if (!timestamp) return "\u2014";
    try {
      return new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...includeTime ? { hour: "numeric", minute: "2-digit" } : {}
      });
    } catch (_) {
      return String(timestamp).replace("T", " ").slice(0, includeTime ? 16 : 10);
    }
  }

  // web/api-client.js
  var api_client_exports = {};
  __export(api_client_exports, {
    OWNER_TOKEN_KEY: () => OWNER_TOKEN_KEY,
    StorageKeys: () => StorageKeys,
    analyzeJob: () => analyzeJob,
    apiCall: () => apiCall,
    approveRewrites: () => approveRewrites,
    askPostAnalysisQuestions: () => askPostAnalysisQuestions,
    createSession: () => createSession,
    deleteSession: () => deleteSession,
    downloadFile: () => downloadFile,
    fetchCVData: () => fetchCVData,
    fetchExperienceDetails: () => fetchExperienceDetails,
    fetchHistory: () => fetchHistory,
    fetchJobFromUrl: () => fetchJobFromUrl,
    fetchPublicationRecommendations: () => fetchPublicationRecommendations,
    fetchRewrites: () => fetchRewrites,
    fetchStatus: () => fetchStatus,
    generateCV: () => generateCV,
    getOwnerToken: () => getOwnerToken,
    getScopedTabDataStorageKey: () => getScopedTabDataStorageKey,
    getSessionIdFromURL: () => getSessionIdFromURL,
    loadExistingItems: () => loadExistingItems,
    loadJobFile: () => loadJobFile,
    loadSession: () => loadSession,
    resetSession: () => resetSession,
    saveSession: () => saveSession,
    sendAction: () => sendAction,
    sendMessage: () => sendMessage,
    sessionAwareFetch: () => sessionAwareFetch,
    setLoading: () => setLoading,
    setSessionIdInURL: () => setSessionIdInURL,
    submitJobText: () => submitJobText,
    submitPostAnalysisAnswers: () => submitPostAnalysisAnswers,
    submitReviewDecisions: () => submitReviewDecisions,
    updateCVData: () => updateCVData,
    updateExperience: () => updateExperience,
    uploadJobFile: () => uploadJobFile
  });
  var StorageKeys = {
    SESSION_ID: "cv-builder-session-id",
    SESSION_PATH: "cv-builder-session-path",
    TAB_DATA: "cv-builder-tab-data",
    CURRENT_TAB: "cv-builder-current-tab",
    CHAT_COLLAPSED: "cv-builder-chat-collapsed"
  };
  var OWNER_TOKEN_KEY = "cv-builder-owner-token";
  function getSessionIdFromURL() {
    if (typeof window === "undefined" || !window.location) return null;
    return new URLSearchParams(window.location.search).get("session");
  }
  function setSessionIdInURL(sessionId2, { replace = false } = {}) {
    if (typeof window === "undefined" || !window.location || !window.history || !sessionId2) return;
    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId2);
    if (replace) {
      window.history.replaceState({}, "", url.toString());
    } else {
      window.history.pushState({}, "", url.toString());
    }
  }
  function getOwnerToken() {
    if (typeof sessionStorage === "undefined") return null;
    let token = sessionStorage.getItem(OWNER_TOKEN_KEY);
    if (!token) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        token = crypto.randomUUID();
      } else {
        token = `tab-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      }
      sessionStorage.setItem(OWNER_TOKEN_KEY, token);
    }
    return token;
  }
  function getScopedTabDataStorageKey(sessionId2 = null) {
    const scopedSessionId = sessionId2 || getSessionIdFromURL();
    return scopedSessionId ? `${StorageKeys.TAB_DATA}-${scopedSessionId}` : StorageKeys.TAB_DATA;
  }
  function _isSessionManagementPath(pathname) {
    return pathname === "/api/sessions/new" || pathname === "/api/sessions/claim" || pathname === "/api/sessions/takeover";
  }
  function _buildSessionAwareRequest(input, init2 = {}) {
    if (typeof window === "undefined" || !window.location) {
      return [input, init2];
    }
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/")) {
      return [input, init2];
    }
    const ownerToken = getOwnerToken();
    if (!url.searchParams.has("owner_token") && !_isSessionManagementPath(url.pathname) && ownerToken) {
      url.searchParams.set("owner_token", ownerToken);
    }
    const sessionId2 = getSessionIdFromURL();
    if (!sessionId2) {
      return [url.toString(), init2];
    }
    const method = (init2.method || "GET").toUpperCase();
    const nextInit = { ...init2 };
    const headers = new Headers(init2.headers || {});
    if (!url.searchParams.has("session_id") && !_isSessionManagementPath(url.pathname)) {
      url.searchParams.set("session_id", sessionId2);
    }
    const needsBodyContext = !["GET", "HEAD"].includes(method);
    const body = nextInit.body;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isURLSearchParams = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
    const contentType = headers.get("Content-Type") || "";
    if (needsBodyContext && !isFormData && !isURLSearchParams) {
      let payload = {};
      if (typeof body === "string" && body.trim()) {
        try {
          payload = JSON.parse(body);
        } catch (_) {
          return [url.toString(), nextInit];
        }
      } else if (body == null) {
        payload = {};
      } else if (typeof body === "object") {
        payload = { ...body };
      }
      if (payload.session_id == null && !_isSessionManagementPath(url.pathname)) {
        payload.session_id = sessionId2;
      }
      if (payload.owner_token == null && !_isSessionManagementPath(url.pathname)) {
        if (ownerToken) payload.owner_token = ownerToken;
      }
      nextInit.body = JSON.stringify(payload);
      if (!contentType) {
        headers.set("Content-Type", "application/json");
      }
    }
    nextInit.headers = headers;
    return [url.toString(), nextInit];
  }
  var _nativeFetch = typeof window !== "undefined" && typeof window.fetch === "function" ? window.fetch.bind(window) : typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
  async function sessionAwareFetch(input, init2 = {}) {
    if (_nativeFetch == null) {
      throw new Error("fetch is not available");
    }
    const [nextInput, nextInit] = _buildSessionAwareRequest(input, init2);
    return _nativeFetch(nextInput, nextInit);
  }
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    window.fetch = sessionAwareFetch;
  }
  async function apiCall(method, endpoint, data = null) {
    const options = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }
    try {
      const response = await sessionAwareFetch(endpoint, options);
      if (response.status === 409) {
        console.warn(`Session conflict on ${endpoint}`);
        throw new Error("Session already active in another tab");
      }
      if (!response.ok) {
        console.error(`API error on ${method} ${endpoint}:`, response.status, response.statusText);
        let errorMessage = response.statusText;
        try {
          const errorJson = await response.json();
          if (errorJson && typeof errorJson === "object") {
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          }
        } catch (_) {
        }
        throw new Error(`${response.status}: ${errorMessage}`);
      }
      const json = await response.json();
      return json;
    } catch (error) {
      console.error(`API call failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }
  async function loadSession(sessionId2) {
    return apiCall("GET", `/api/load-session?id=${encodeURIComponent(sessionId2)}`);
  }
  async function createSession() {
    return apiCall("POST", "/api/sessions/new");
  }
  async function deleteSession(sessionId2) {
    return apiCall("POST", "/api/delete-session", { session_id: sessionId2 });
  }
  async function fetchStatus() {
    return apiCall("GET", "/api/status");
  }
  async function fetchHistory() {
    return apiCall("GET", "/api/history");
  }
  async function saveSession() {
    return apiCall("POST", "/api/save");
  }
  async function resetSession() {
    return apiCall("POST", "/api/reset");
  }
  async function uploadJobFile(formData) {
    try {
      const response = await fetch("/api/upload-file", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        console.error(`API error on POST /api/upload-file:`, response.status, response.statusText);
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      return json;
    } catch (error) {
      console.error(`API call failed: POST /api/upload-file`, error);
      throw error;
    }
  }
  async function submitJobText(jobText) {
    return apiCall("POST", "/api/job", { job_description: jobText });
  }
  async function fetchJobFromUrl(url) {
    return apiCall("POST", "/api/fetch-job-url", { url });
  }
  async function loadJobFile(path) {
    return apiCall("GET", `/api/load-job-file?path=${encodeURIComponent(path)}`);
  }
  async function loadExistingItems() {
    return apiCall("GET", "/api/load-items");
  }
  async function analyzeJob() {
    return apiCall("POST", "/api/action", { action: "analyze_job" });
  }
  async function askPostAnalysisQuestions(analysisData) {
    return apiCall("POST", "/api/post-analysis-questions", { analysis: analysisData });
  }
  async function submitPostAnalysisAnswers(answers) {
    return apiCall("POST", "/api/post-analysis-responses", { answers });
  }
  async function sendMessage(message) {
    return apiCall("POST", "/api/message", { message });
  }
  async function sendAction(action, data = {}) {
    return apiCall("POST", "/api/action", { action, ...data });
  }
  async function fetchCVData() {
    return apiCall("GET", "/api/cv-data");
  }
  async function updateCVData(cvData) {
    return apiCall("POST", "/api/cv-data", { cv_data: cvData });
  }
  async function updateExperience(experienceId, updates) {
    return apiCall("POST", "/api/experience-details", { id: experienceId, ...updates });
  }
  async function fetchExperienceDetails(experienceId) {
    return apiCall("GET", `/api/experience-details?id=${encodeURIComponent(experienceId)}`);
  }
  async function fetchPublicationRecommendations() {
    return apiCall("GET", "/api/publication-recommendations");
  }
  async function submitReviewDecisions(decisions) {
    return apiCall("POST", "/api/review-decisions", decisions);
  }
  async function fetchRewrites() {
    return apiCall("GET", "/api/rewrites");
  }
  async function approveRewrites(decisions) {
    return apiCall("POST", "/api/rewrites/approve", { decisions });
  }
  async function generateCV(options = {}) {
    const payload = {
      formats: options.formats || ["ats_docx", "human_pdf", "human_docx"],
      ...options
    };
    return apiCall("POST", "/api/generate", payload);
  }
  async function downloadFile(filename) {
    const response = await fetch(`/api/download/${encodeURIComponent(filename)}`);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    return response.blob();
  }
  function setLoading(isLoading2) {
    let loadingElement = document.getElementById("loading-indicator");
    if (!loadingElement) {
      loadingElement = document.createElement("div");
      loadingElement.id = "loading-indicator";
      loadingElement.style.display = "none";
      document.body.appendChild(loadingElement);
    }
    loadingElement.style.display = isLoading2 ? "block" : "none";
  }

  // web/state-manager.js
  var state_manager_exports = {};
  __export(state_manager_exports, {
    GENERATION_PHASES: () => GENERATION_PHASES,
    PHASES: () => PHASES,
    clearState: () => clearState,
    initializeState: () => initializeState,
    loadStateFromLocalStorage: () => loadStateFromLocalStorage,
    saveStateToLocalStorage: () => saveStateToLocalStorage,
    stateManager: () => stateManager
  });
  var PHASES = {
    INIT: "init",
    JOB_ANALYSIS: "job_analysis",
    CUSTOMIZATION: "customization",
    REWRITE_REVIEW: "rewrite_review",
    SPELL_CHECK: "spell_check",
    GENERATION: "generation",
    LAYOUT_REVIEW: "layout_review",
    REFINEMENT: "refinement"
  };
  var GENERATION_PHASES = {
    IDLE: "idle",
    // No preview generated yet
    PREVIEW: "preview",
    // HTML preview generated; in layout review
    CONFIRMED: "confirmed",
    // Layout confirmed; awaiting final outputs
    FINAL_COMPLETE: "final_complete"
    // Final PDF/DOCX produced
  };
  var currentTab = "job";
  var isLoading = false;
  var tabData2 = {
    analysis: null,
    customizations: null,
    cv: null
  };
  var interactiveState = {
    isReviewing: false,
    currentIndex: 0,
    type: null,
    // 'experiences' or 'skills'
    data: null
  };
  var sessionId = null;
  var lastKnownPhase = PHASES.INIT;
  var currentModelProvider = null;
  var currentModelName = null;
  var generationState = {
    phase: GENERATION_PHASES.IDLE,
    previewAvailable: false,
    layoutConfirmed: false,
    pageCountEstimate: null,
    pageWarning: false,
    layoutInstructionsCount: 0
  };
  var atsScore = null;
  var stateManager = {
    // Tab state
    getCurrentTab: () => currentTab,
    setCurrentTab: (tab) => {
      currentTab = tab;
      saveStateToLocalStorage();
    },
    // Loading state
    isLoading: () => isLoading,
    setLoading: (loading) => {
      isLoading = loading;
    },
    // Tab data (analysis, customizations, CV)
    getTabData: (tab) => tabData2[tab],
    setTabData: (tab, data) => {
      tabData2[tab] = data;
      saveStateToLocalStorage();
    },
    // Interactive state (for experience/skill selection review)
    getInteractiveState: () => interactiveState,
    setInteractiveState: (state) => {
      interactiveState = { ...interactiveState, ...state };
      saveStateToLocalStorage();
    },
    // Session management
    getSessionId: () => sessionId,
    setSessionId: (id) => {
      sessionId = id;
      localStorage.setItem(StorageKeys.SESSION_ID, id);
    },
    // Model/provider selection
    getCurrentModelProvider: () => currentModelProvider,
    getCurrentModelName: () => currentModelName,
    setCurrentModel: (provider, model) => {
      currentModelProvider = provider || null;
      currentModelName = model || null;
      saveStateToLocalStorage();
    },
    // Phase tracking
    getPhase: () => lastKnownPhase,
    setPhase: (phase) => {
      lastKnownPhase = phase;
      saveStateToLocalStorage();
    },
    // Post-analysis questions
    getPostAnalysisQuestions: () => window.postAnalysisQuestions || [],
    setPostAnalysisQuestions: (questions) => {
      window.postAnalysisQuestions = questions;
    },
    // Question answers
    getQuestionAnswers: () => window.questionAnswers || {},
    setQuestionAnswers: (answers) => {
      window.questionAnswers = answers;
    },
    // Pending recommendations
    getPendingRecommendations: () => window.pendingRecommendations || null,
    setPendingRecommendations: (rec) => {
      window.pendingRecommendations = rec;
      saveStateToLocalStorage();
    },
    // ATS score state (GAP-21)
    getAtsScore: () => atsScore,
    setAtsScore: (score) => {
      atsScore = score;
      saveStateToLocalStorage();
    },
    clearAtsScore: () => {
      atsScore = null;
      saveStateToLocalStorage();
    },
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
        layoutInstructionsCount: 0
      };
      saveStateToLocalStorage();
    }
  };
  function initializeState() {
    currentTab = "job";
    isLoading = false;
    tabData2 = {
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
      layoutInstructionsCount: 0
    };
    let storedId = localStorage.getItem(StorageKeys.SESSION_ID);
    if (!storedId) {
      storedId = "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(StorageKeys.SESSION_ID, storedId);
    }
    sessionId = storedId;
    saveStateToLocalStorage();
  }
  function loadStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem(StorageKeys.TAB_DATA);
      if (!saved) return false;
      const data = JSON.parse(saved);
      const age = Date.now() - (data.timestamp || 0);
      if (age > 24 * 60 * 60 * 1e3) {
        localStorage.removeItem(StorageKeys.TAB_DATA);
        return false;
      }
      if (data.tabData) {
        tabData2 = { ...tabData2, ...data.tabData };
      }
      if (data.interactiveState) {
        interactiveState = { ...interactiveState, ...data.interactiveState };
      }
      if (data.pendingRecommendations) {
        window.pendingRecommendations = data.pendingRecommendations;
      }
      if (data.currentModelProvider) {
        currentModelProvider = data.currentModelProvider;
      }
      if (data.currentModelName) {
        currentModelName = data.currentModelName;
      }
      if (data.postAnalysisQuestions) {
        window.postAnalysisQuestions = data.postAnalysisQuestions;
      }
      if (data.questionAnswers) {
        window.questionAnswers = data.questionAnswers;
      }
      if (data.lastKnownPhase) {
        lastKnownPhase = data.lastKnownPhase;
      }
      if (data.generationState) {
        generationState = { ...generationState, ...data.generationState };
      }
      if (data.atsScore) {
        atsScore = data.atsScore;
      }
      return true;
    } catch (error) {
      console.warn("Failed to load state from localStorage:", error);
      return false;
    }
  }
  function saveStateToLocalStorage() {
    try {
      const dataToSave = {
        timestamp: Date.now(),
        tabData: tabData2,
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
        atsScore
      };
      localStorage.setItem(StorageKeys.TAB_DATA, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn("Failed to save state to localStorage:", error);
    }
  }
  function clearState() {
    initializeState();
    Object.values(StorageKeys).forEach((key) => localStorage.removeItem(key));
  }

  // web/ui-core.js
  var ui_core_exports = {};
  __export(ui_core_exports, {
    closeAlertModal: () => closeAlertModal,
    closeAllModals: () => closeAllModals,
    closeModal: () => closeModal,
    closeModelModal: () => closeModelModal,
    confirmDialog: () => confirmDialog,
    displayMessage: () => displayMessage,
    getStageForTab: () => getStageForTab,
    initialize: () => initialize,
    loadModelSelector: () => loadModelSelector,
    loadTabContent: () => loadTabContent,
    openModal: () => openModal,
    openModelModal: () => openModelModal,
    refreshModelPricing: () => refreshModelPricing,
    restoreFocus: () => restoreFocus,
    setControlsEnabled: () => setControlsEnabled,
    setInitialFocus: () => setInitialFocus,
    setModel: () => setModel,
    setupEventListeners: () => setupEventListeners,
    showAlertModal: () => showAlertModal,
    showSessionConflictBanner: () => showSessionConflictBanner,
    switchStage: () => switchStage,
    testCurrentModel: () => testCurrentModel,
    toggleChat: () => toggleChat,
    trapFocus: () => trapFocus,
    updatePhaseIndicator: () => updatePhaseIndicator,
    updateTabBarForStage: () => updateTabBarForStage
  });
  var _focusedElementBeforeModal = null;
  var _currentFocusTrapListener = null;
  function getFocusableElements(container) {
    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    return Array.from(container.querySelectorAll(focusableSelectors));
  }
  function setInitialFocus(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const focusTarget = modal.querySelector('[data-focus-target="true"]') || modal.querySelector('input[type="text"]') || modal.querySelector("button");
    if (focusTarget) {
      setTimeout(() => focusTarget.focus(), 50);
    }
  }
  function trapFocus(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (_currentFocusTrapListener) {
      document.removeEventListener("keydown", _currentFocusTrapListener);
    }
    const focusableElements = getFocusableElements(modal);
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    _currentFocusTrapListener = (e) => {
      if (e.key !== "Tab") return;
      const isShift = e.shiftKey;
      const activeEl = document.activeElement;
      if (isShift) {
        if (activeEl === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeEl === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener("keydown", _currentFocusTrapListener);
  }
  function restoreFocus() {
    if (_focusedElementBeforeModal && typeof _focusedElementBeforeModal.focus === "function") {
      _focusedElementBeforeModal.focus();
    }
    _focusedElementBeforeModal = null;
    if (_currentFocusTrapListener) {
      document.removeEventListener("keydown", _currentFocusTrapListener);
      _currentFocusTrapListener = null;
    }
  }
  var STAGE_TABS = {
    job: ["job"],
    analysis: ["analysis", "questions"],
    customizations: ["exp-review", "ach-editor", "skills-review", "achievements-review", "summary-review", "publications-review"],
    rewrite: ["rewrite"],
    spell: ["spell"],
    generate: ["generate"],
    layout: ["layout"],
    finalise: ["download", "finalise", "master", "cover-letter", "screening"]
  };
  var currentStage = "job";
  function confirmDialog(message, { confirmLabel = "OK", cancelLabel = "Cancel", danger = false } = {}) {
    return new Promise((resolve) => {
      let overlay = document.getElementById("confirm-dialog-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "confirm-dialog-overlay";
        overlay.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9999;align-items:center; justify-content:center;";
        overlay.innerHTML = '<div id="confirm-dialog-box" style="background:#fff; border-radius:8px; padding:24px 28px;max-width:400px; width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.18); font-family:inherit;"><p id="confirm-dialog-msg" style="margin:0 0 20px; font-size:0.95em; color:#1e293b; white-space:pre-wrap;"></p><div style="display:flex; gap:8px; justify-content:flex-end;"><button id="confirm-dialog-cancel" style="padding:6px 16px; border:1px solid #cbd5e1;border-radius:5px; background:#f8fafc; cursor:pointer; color:#475569;"></button><button id="confirm-dialog-ok" style="padding:6px 16px; border:none;border-radius:5px; cursor:pointer; color:#fff; font-weight:600;"></button></div></div>';
        document.body.appendChild(overlay);
      }
      const okBtn = document.getElementById("confirm-dialog-ok");
      const cancelBtn = document.getElementById("confirm-dialog-cancel");
      const msgEl = document.getElementById("confirm-dialog-msg");
      msgEl.textContent = message;
      okBtn.textContent = confirmLabel;
      cancelBtn.textContent = cancelLabel;
      okBtn.style.background = danger ? "#dc2626" : "#3b82f6";
      overlay.style.display = "flex";
      const finish = (result) => {
        overlay.style.display = "none";
        okBtn.replaceWith(okBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        resolve(result);
      };
      document.getElementById("confirm-dialog-ok").addEventListener("click", () => finish(true), { once: true });
      document.getElementById("confirm-dialog-cancel").addEventListener("click", () => finish(false), { once: true });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) finish(false);
      }, { once: true });
    });
  }
  (function() {
    const _origFetch = window.fetch;
    window.fetch = async function(...args) {
      const resp = await _origFetch.apply(this, args);
      let shouldShowBanner = true;
      try {
        const rawUrl = typeof args[0] === "string" ? args[0] : args[0]?.url;
        const url = new URL(rawUrl, window.location.origin);
        shouldShowBanner = url.pathname !== "/api/sessions/claim" && url.pathname !== "/api/sessions/takeover";
      } catch (_) {
        shouldShowBanner = true;
      }
      if (resp.status === 409 && shouldShowBanner) {
        showSessionConflictBanner();
      }
      return resp;
    };
  })();
  async function initialize() {
    try {
      if (typeof initializeState === "function") {
        initializeState();
      }
      if (typeof restoreSession === "function") {
        await restoreSession();
      }
      setupEventListeners();
      if (typeof loadStateFromLocalStorage === "function") {
        loadStateFromLocalStorage();
      }
      const savedTab = localStorage.getItem(StorageKeys.CURRENT_TAB) || "job";
      switchTab(savedTab);
      console.log("\u2705 Application initialized");
    } catch (error) {
      console.error("Initialization error:", error);
      appendMessage("system", `\u26A0\uFE0F Failed to initialize: ${error.message}`);
    }
  }
  function setupEventListeners() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabName = e.target.id.replace("tab-", "");
        const targetStage = getStageForTab(tabName);
        if (targetStage && typeof _STEP_ORDER !== "undefined" && typeof _showReRunConfirmModal === "function") {
          const targetIdx = _STEP_ORDER.indexOf(targetStage);
          const currentIdx = _STEP_ORDER.indexOf(currentStage);
          const targetStepEl = document.getElementById(`step-${targetStage}`);
          if (targetIdx < currentIdx && targetStepEl && targetStepEl.classList.contains("completed")) {
            _showReRunConfirmModal(targetStage, "back-nav", () => switchTab(tabName));
            return;
          }
        }
        switchTab(tabName);
      });
      tab.addEventListener("keydown", (e) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const tabs = Array.from(document.querySelectorAll('.tab:not([style*="display: none"])'));
          const currentIndex = tabs.indexOf(e.target);
          let nextTab;
          if (e.key === "ArrowLeft" || e.key === "Home") {
            nextTab = e.key === "Home" ? tabs[0] : tabs[(currentIndex - 1 + tabs.length) % tabs.length];
          } else {
            nextTab = e.key === "End" ? tabs[tabs.length - 1] : tabs[(currentIndex + 1) % tabs.length];
          }
          if (nextTab) {
            nextTab.focus();
            nextTab.click();
          }
        }
      });
    });
    const messageInput = document.getElementById("message-input");
    if (messageInput) {
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (typeof sendMessage === "function") {
            sendMessage();
          }
        }
      });
    }
    const toggleBtn = document.querySelector(".toggle-chat");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggleChat);
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    });
    document.querySelectorAll('[role="dialog"]').forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });
  }
  function getStageForTab(tab) {
    for (const [stage, tabs] of Object.entries(STAGE_TABS)) {
      if (tabs.includes(tab)) return stage;
    }
    return null;
  }
  function updateTabScrollButtons() {
    const tabBar = document.getElementById("tab-bar");
    const leftBtn = document.getElementById("tab-scroll-left");
    const rightBtn = document.getElementById("tab-scroll-right");
    if (!tabBar || !leftBtn || !rightBtn) return;
    leftBtn.style.display = tabBar.scrollLeft > 0 ? "" : "none";
    rightBtn.style.display = tabBar.scrollLeft < tabBar.scrollWidth - tabBar.clientWidth - 1 ? "" : "none";
  }
  function updateTabBarForStage(stage) {
    const stageTabs = STAGE_TABS[stage] || [];
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.style.display = stageTabs.includes(tab.dataset.tab) ? "" : "none";
    });
    const tabBar = document.getElementById("tab-bar");
    if (tabBar) tabBar.scrollLeft = 0;
    updateTabScrollButtons();
  }
  function switchStage(stage) {
    currentStage = stage;
    updateTabBarForStage(stage);
    const stageTabs = STAGE_TABS[stage] || [];
    if (stageTabs.length === 0) return;
    const activeTab = document.querySelector(".tab.active");
    const activeTabName = activeTab ? activeTab.dataset.tab : null;
    const target = activeTabName && stageTabs.includes(activeTabName) ? activeTabName : stageTabs[0];
    switchTab(target);
  }
  async function loadTabContent(tab) {
    const content = document.getElementById("document-content");
    if (!content) return;
    content.innerHTML = "";
    try {
      switch (tab) {
        case "job":
          if (typeof populateJobTab === "function") {
            await populateJobTab();
          }
          break;
        case "analysis":
          if (typeof populateAnalysisTab === "function" && tabData.analysis) {
            populateAnalysisTab(tabData.analysis);
          } else {
            content.innerHTML = '<p style="padding: 20px; color: #666;">No analysis data yet. Submit a job description to begin.</p>';
          }
          break;
        case "customizations":
          if (typeof populateCustomizationsTab === "function" && tabData.customizations) {
            populateCustomizationsTab(tabData.customizations);
          } else {
            content.innerHTML = '<p style="padding: 20px; color: #666;">Run analysis first to see customization recommendations.</p>';
          }
          break;
        case "generate":
          if (typeof populateCVTab === "function" && tabData.cv) {
            populateCVTab(tabData.cv);
          } else {
            content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV to see preview.</p>';
          }
          break;
        case "download":
          if (typeof populateDownloadTab === "function" && tabData.cv) {
            await populateDownloadTab(tabData.cv);
          } else {
            content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV first to download.</p>';
          }
          break;
        default:
          content.innerHTML = '<p style="padding: 20px; color: #999;">Unknown tab.</p>';
      }
    } catch (error) {
      console.error(`Error loading tab ${tab}:`, error);
      content.innerHTML = `<p style="padding: 20px; color: #c41e3a;">Error loading content: ${error.message}</p>`;
    }
  }
  function toggleChat() {
    const interactionArea = document.querySelector(".interaction-area");
    const viewerArea = document.querySelector(".viewer-area");
    if (interactionArea) {
      const isCollapsed = interactionArea.classList.toggle("collapsed");
      if (viewerArea) {
        viewerArea.style.flex = isCollapsed ? "1 1 100%" : "0 1 60%";
      }
      try {
        localStorage.setItem(StorageKeys.CHAT_COLLAPSED, isCollapsed);
      } catch (e) {
        console.warn("Could not save chat state");
      }
    }
  }
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      _focusedElementBeforeModal = document.activeElement;
      modal.classList.add("visible");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      setInitialFocus(modalId);
      trapFocus(modalId);
    }
  }
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("visible");
      modal.setAttribute("aria-hidden", "true");
      if (!document.querySelector('[role="dialog"].visible')) {
        document.body.style.overflow = "";
      }
      restoreFocus();
    }
  }
  function closeAllModals() {
    document.querySelectorAll('[role="dialog"]').forEach((modal) => {
      modal.classList.remove("visible");
      modal.setAttribute("aria-hidden", "true");
      if (modal.style.display && modal.style.display !== "none") {
        modal.style.display = "none";
      }
    });
    document.body.style.overflow = "";
    restoreFocus();
  }
  function showSessionConflictBanner() {
    const banner = document.getElementById("session-conflict-banner");
    if (banner) {
      banner.style.display = "block";
    }
  }
  function showAlertModal(title, message) {
    const modal = document.getElementById("alert-modal");
    if (!modal) {
      const newModal = document.createElement("div");
      newModal.id = "alert-modal";
      newModal.setAttribute("role", "dialog");
      newModal.innerHTML = `
      <div class="modal-overlay alert-modal-overlay" style="display: none;">
        <div class="modal-content alert-modal">
          <h2 id="alert-title"></h2>
          <p id="alert-message"></p>
          <button onclick="closeAlertModal()" class="modal-btn">OK</button>
        </div>
      </div>
    `;
      document.body.appendChild(newModal);
    }
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").innerHTML = message;
    openModal("alert-modal");
  }
  function closeAlertModal() {
    closeModal("alert-modal");
  }
  async function displayMessage(phase, response) {
    try {
      switch (phase) {
        case "job_input":
          if (response.error) {
            appendMessage("system", `Error: ${response.error}`);
          } else if (response.job_analysis) {
            tabData.analysis = response.job_analysis;
            appendMessage("assistant", `Analysis complete! I'll now show you the job analysis and post-analysis questions.`);
            switchTab("analysis");
            if (typeof populateAnalysisTab === "function") {
              populateAnalysisTab(response.job_analysis);
            }
            if (typeof askPostAnalysisQuestions === "function") {
              await askPostAnalysisQuestions(response.job_analysis);
            }
          }
          break;
        case "customization_selection":
          if (response.customizations) {
            tabData.customizations = response.customizations;
            window.pendingRecommendations = response.customizations;
            switchTab("customizations");
            if (typeof populateCustomizationsTab === "function") {
              populateCustomizationsTab(response.customizations);
            }
          }
          break;
        case "rewrite_review":
          if (response.rewrites) {
            switchTab("rewrites");
            if (typeof fetchAndReviewRewrites === "function") {
              await fetchAndReviewRewrites();
            }
          }
          break;
        case "generation":
          if (response.generated_files) {
            tabData.cv = response.generated_files;
            switchTab("download");
            if (typeof populateDownloadTab === "function") {
              await populateDownloadTab(response.generated_files);
            }
          }
          break;
        default:
          if (response.message || response.response) {
            appendMessage("assistant", response.message || response.response);
          }
      }
    } catch (error) {
      console.error("Error displaying message:", error);
      appendMessage("system", `Error processing response: ${error.message}`);
    }
  }
  function updatePhaseIndicator(status) {
    if (!status.phase) return;
    const sessionNameEl = document.getElementById("header-session-name");
    if (sessionNameEl) {
      sessionNameEl.textContent = status.position_name || "";
    }
    const phases = ["job_input", "analysis", "customization", "rewrite_review", "generation", "refinement"];
    const phaseIndex = phases.indexOf(status.phase);
    document.querySelectorAll(".step").forEach((step, idx) => {
      step.classList.remove("active", "completed", "upcoming");
      if (idx < phaseIndex) {
        step.classList.add("completed");
      } else if (idx === phaseIndex) {
        step.classList.add("active");
      } else {
        step.classList.add("upcoming");
      }
    });
  }
  function setControlsEnabled(enabled) {
    document.querySelectorAll("button, input, textarea").forEach((el) => {
      el.disabled = !enabled;
    });
  }
  var _modelData = null;
  var _modelDataTable = null;
  var _selectedModelProviders = /* @__PURE__ */ new Set();
  var _modelSelectorLoading = false;
  var _catalogRefreshing = false;
  async function loadModelSelector() {
    if (_modelSelectorLoading) return;
    _modelSelectorLoading = true;
    try {
      _modelData = await apiCall("GET", "/api/model");
      try {
        const saved = localStorage.getItem(StorageKeys.TAB_DATA);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && !(_modelData && _modelData.provider) && parsed.currentModelProvider) {
            _modelData = _modelData || {};
            _modelData.provider = parsed.currentModelProvider;
          }
          if (parsed && !(_modelData && _modelData.model) && parsed.currentModelName) {
            _modelData = _modelData || {};
            _modelData.model = parsed.currentModelName;
          }
        }
      } catch (e) {
        console.warn("Could not read saved model from localStorage:", e);
      }
      const label = document.getElementById("model-current-label");
      if (label) {
        const prov = _modelData.provider;
        const model = _modelData.model || "\u2014";
        label.textContent = prov ? `${prov} \xB7 ${model}` : model;
      }
      if (_modelData && _modelData.provider) {
        _selectedModelProviders = /* @__PURE__ */ new Set([_modelData.provider]);
      }
    } catch (e) {
      console.warn("Could not load model list:", e);
    } finally {
      _modelSelectorLoading = false;
    }
  }
  function _providerStageLabel(provider, capableSet) {
    const isCapable = capableSet.has(provider);
    return isCapable ? "list_models" : "fallback";
  }
  function _renderProviderSelector() {
    const listEl = document.getElementById("model-provider-list");
    if (!listEl || !_modelData) return;
    const providers = Array.isArray(_modelData.providers) ? _modelData.providers : Array.from(new Set((_modelData.all_models || []).map((r) => r.provider).filter(Boolean))).sort();
    const capableSet = new Set(_modelData.list_models_capable || []);
    if (_selectedModelProviders.size === 0 && _modelData.provider) {
      _selectedModelProviders.add(_modelData.provider);
    }
    listEl.innerHTML = "";
    providers.forEach((provider) => {
      const checked = _selectedModelProviders.has(provider);
      const sourceLabel = _providerStageLabel(provider, capableSet);
      const label = document.createElement("label");
      label.style.cssText = "display:flex; align-items:center; gap:6px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:999px; font-size:0.82em; background:#fff; cursor:pointer;";
      label.innerHTML = `<input type="checkbox" value="${escapeHtml(provider)}" ${checked ? "checked" : ""} style="margin:0;" /><span>${escapeHtml(provider)}</span><span style="color:#64748b; font-size:0.8em;">(${escapeHtml(sourceLabel)})</span>`;
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", async (event) => {
        if (event.target.checked) {
          _selectedModelProviders.add(provider);
        } else {
          _selectedModelProviders.delete(provider);
        }
        if (_selectedModelProviders.size === 0 && _modelData.provider) {
          _selectedModelProviders.add(_modelData.provider);
          event.target.checked = true;
        }
        await _refreshModelCatalogForSelection();
      });
      listEl.appendChild(label);
    });
  }
  async function _refreshModelCatalogForSelection() {
    if (_catalogRefreshing || !_modelData) return;
    _catalogRefreshing = true;
    try {
      const selected = Array.from(_selectedModelProviders);
      if (!selected.length) {
        _selectedModelProviders = /* @__PURE__ */ new Set([_modelData.provider]);
      }
      const providersParam = encodeURIComponent(Array.from(_selectedModelProviders).join(","));
      const catalog = await apiCall("GET", `/api/model-catalog?providers=${providersParam}`);
      _modelData.all_models = catalog.all_models || [];
      _modelData.pricing_updated_at = catalog.pricing_updated_at || _modelData.pricing_updated_at;
      _modelData.pricing_source = catalog.pricing_source || _modelData.pricing_source;
      if (Array.isArray(catalog.providers) && catalog.providers.length) {
        _modelData.providers = catalog.providers;
      }
      if (Array.isArray(catalog.list_models_capable)) {
        _modelData.list_models_capable = catalog.list_models_capable;
      }
    } catch (error) {
      console.warn("Could not refresh model catalog for selected providers:", error);
    } finally {
      _catalogRefreshing = false;
    }
    _buildModelTable();
  }
  async function openModelModal() {
    const overlay = document.getElementById("model-modal-overlay");
    if (!overlay) return;
    if (!_modelData) {
      await loadModelSelector();
    }
    _renderProviderSelector();
    await _refreshModelCatalogForSelection();
    overlay.style.display = "flex";
    _focusedElementBeforeModal = document.activeElement;
    setInitialFocus("model-modal-overlay");
    trapFocus("model-modal-overlay");
  }
  function closeModelModal() {
    const overlay = document.getElementById("model-modal-overlay");
    if (overlay) overlay.style.display = "none";
    restoreFocus();
  }
  function _applyModelRowVisualState(tr, isActive) {
    tr.classList.toggle("model-row-active", isActive);
    tr.style.cssText = isActive ? "background:#eff6ff; font-weight:600; cursor:pointer;" : "cursor:pointer;";
    const model = tr.getAttribute("data-model") || "";
    const modelCell = tr.cells && tr.cells[1];
    if (modelCell) {
      modelCell.innerHTML = `${escapeHtml(model)}` + (isActive ? ' <span style="color:#3b82f6; font-size:0.75em;">&#10003; active</span>' : "");
    }
  }
  function _syncModelTableSelection() {
    const tbody = document.getElementById("model-table-body");
    if (!tbody || !_modelData) return;
    const activeProvider = _modelData.provider;
    const activeModel = _modelData.model;
    tbody.querySelectorAll("tr").forEach((tr) => {
      const isActive = tr.getAttribute("data-provider") === activeProvider && tr.getAttribute("data-model") === activeModel;
      _applyModelRowVisualState(tr, isActive);
    });
  }
  function _buildModelTable() {
    const tbody = document.getElementById("model-table-body");
    const thead = document.getElementById("model-table-head");
    if (!tbody || !_modelData) return;
    const currentProvider = _modelData.provider;
    const currentModel = _modelData.model;
    if (thead) {
      const thS = "padding:10px 14px; white-space:nowrap;";
      thead.innerHTML = `<tr style="background:#f1f5f9; text-align:left;"><th style="${thS}">Provider</th><th style="${thS}">Model</th><th style="${thS} text-align:right;">Context</th><th style="${thS} text-align:right;" title="USD per 1M input tokens (direct API billing)">$/1M in</th><th style="${thS} text-align:right;" title="USD per 1M output tokens (direct API billing)">$/1M out</th><th style="${thS} text-align:right;" title="GitHub Copilot premium-request multiplier (0 = free for paid subscribers)">Copilot</th><th style="${thS}">Source</th><th style="${thS}">Notes</th></tr>`;
    }
    if (window.$ && $.fn && $.fn.DataTable && $.fn.DataTable.isDataTable("#model-table")) {
      try {
        _modelDataTable = $("#model-table").DataTable();
        _modelDataTable.destroy();
      } catch (e) {
        console.warn("DataTable.destroy() failed (table may already be torn down):", e);
      } finally {
        _modelDataTable = null;
      }
    }
    let rows = _modelData.all_models && _modelData.all_models.length ? _modelData.all_models.filter((r) => r.model) : (_modelData.available || []).map(
      (r) => typeof r === "object" ? { ...r, provider: currentProvider } : { model: r, provider: currentProvider }
    );
    tbody.innerHTML = "";
    const tdBase = "padding:9px 14px; border-bottom:1px solid #e2e8f0;";
    const fmtCost = (v) => v != null ? "$" + Number(v).toFixed(v < 1 ? 3 : 2) : "\u2014";
    const fmtPriceHint = (source) => {
      if (source === "runtime_cache") {
        return '<span title="Price from runtime cache" style="margin-left:6px; display:inline-block; padding:1px 5px; border-radius:999px; background:#ecfeff; color:#0f766e; font-size:0.72em; font-weight:600; vertical-align:middle;">cache</span>';
      }
      return '<span title="Price from static baseline" style="margin-left:6px; display:inline-block; padding:1px 5px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:0.72em; font-weight:600; vertical-align:middle;">static</span>';
    };
    const fmtSource = (s) => {
      if (s === "list_models") {
        return '<span style="display:inline-block; padding:2px 6px; border-radius:999px; background:#ecfeff; color:#0f766e; font-size:0.78em; font-weight:600;">list_models</span>';
      }
      return '<span style="display:inline-block; padding:2px 6px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:0.78em; font-weight:600;">fallback_static</span>';
    };
    const fmtMult = (v) => {
      if (v == null) return "\u2014";
      if (v === 0) return '<span style="color:#16a34a; font-weight:600;">free</span>';
      return Number(v).toFixed(v % 1 === 0 ? 0 : 2) + "&times;";
    };
    rows.forEach((item) => {
      const provider = item.provider || currentProvider;
      const m = item.model;
      const ctx = item.context_window ? Number(item.context_window).toLocaleString() : "\u2014";
      const source = item.source || "fallback_static";
      const priceSource = item.price_source || "static_baseline";
      const notes = item.notes || "";
      const isSelected = provider === currentProvider && m === currentModel;
      const tr = document.createElement("tr");
      tr.setAttribute("data-provider", provider);
      tr.setAttribute("data-model", m);
      _applyModelRowVisualState(tr, isSelected);
      tr.addEventListener("mouseover", () => {
        if (!tr.classList.contains("model-row-active")) tr.style.background = "#f8fafc";
      });
      tr.addEventListener("mouseout", () => {
        if (!tr.classList.contains("model-row-active")) tr.style.background = "";
      });
      tr.innerHTML = `<td style="${tdBase} color:#64748b; white-space:nowrap;">${escapeHtml(provider)}</td><td style="${tdBase}">${escapeHtml(m)}</td><td style="${tdBase} white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums;">${ctx}</td><td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_input)}${fmtPriceHint(priceSource)}</td><td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_output)}${fmtPriceHint(priceSource)}</td><td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtMult(item.copilot_multiplier)}</td><td style="${tdBase} white-space:nowrap;">${fmtSource(source)}</td><td style="${tdBase} color:#64748b;">${notes}</td>`;
      tbody.appendChild(tr);
    });
    tbody.onclick = async (event) => {
      const tr = event.target.closest("tr");
      if (!tr) return;
      const provider = tr.getAttribute("data-provider");
      const model = tr.getAttribute("data-model");
      if (!model) return;
      tr.style.cssText = "background:#fef3c7; cursor:wait; opacity:0.85;";
      const modelCell = tr.cells && tr.cells[1];
      if (modelCell) {
        modelCell.innerHTML = `<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:6px;"></span>${escapeHtml(model)}`;
      }
      const status = document.getElementById("model-test-status");
      if (status) {
        status.style.display = "";
        status.style.color = "#92400e";
        status.innerHTML = `<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:6px;"></span> Switching to ${escapeHtml(model)}\u2026`;
      }
      await setModel(model, provider);
    };
    if (window.$ && $.fn && $.fn.DataTable) {
      _modelDataTable = $("#model-table").DataTable({
        paging: false,
        searching: true,
        info: false,
        orderCellsTop: true,
        order: [[0, "asc"], [1, "asc"]],
        autoWidth: false,
        language: { search: "Filter:" },
        initComplete: function() {
          const api = this.api();
          const $thead = $("#model-table thead");
          const hasFilterRow = $thead.find("tr.model-filter-row").length > 0;
          if (!hasFilterRow) {
            const $filterRow = $('<tr class="model-filter-row"></tr>');
            api.columns().every(function(colIdx) {
              const title = $(api.column(colIdx).header()).text().trim();
              const $th = $('<th style="padding:6px 10px; background:#f8fafc; border-top:1px solid #e2e8f0;"></th>');
              const $input = $(`<input type="text" placeholder="${title}" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82em;" />`);
              $th.append($input);
              $filterRow.append($th);
            });
            $thead.append($filterRow);
          }
          api.columns().every(function(colIdx) {
            const $input = $("#model-table thead tr.model-filter-row th").eq(colIdx).find("input");
            if (!$input.length) return;
            $input.off("click.modelFilter keyup.modelFilter change.modelFilter");
            $input.on("click.modelFilter", function(event) {
              event.stopPropagation();
            });
            $input.on("keyup.modelFilter change.modelFilter", function() {
              const value = this.value;
              if (api.column(colIdx).search() !== value) {
                api.column(colIdx).search(value).draw();
              }
            });
          });
        }
      });
    }
    _syncModelTableSelection();
    _updatePricingFooter();
  }
  async function setModel(model, provider) {
    if (!model) return;
    try {
      const payload = provider ? { model, provider } : { model };
      await apiCall("POST", "/api/model", payload);
      if (_modelData) {
        _modelData.model = model;
        if (provider) _modelData.provider = provider;
      }
      const label = document.getElementById("model-current-label");
      if (label) {
        const prov = _modelData && _modelData.provider || provider;
        label.textContent = prov ? `${prov} \xB7 ${model}` : model;
      }
      _syncModelTableSelection();
      testCurrentModel();
      try {
        const saved = localStorage.getItem(StorageKeys.TAB_DATA);
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.currentModelProvider = provider || _modelData && _modelData.provider || null;
        parsed.currentModelName = model || _modelData && _modelData.model || null;
        localStorage.setItem(StorageKeys.TAB_DATA, JSON.stringify(parsed));
      } catch (e) {
        console.warn("Failed to persist model selection locally:", e);
      }
    } catch (e) {
      console.error("Failed to switch model:", e);
      const msg = e.message || String(e);
      _syncModelTableSelection();
      const status = document.getElementById("model-test-status");
      if (status) {
        status.style.display = "";
        status.style.color = "#dc2626";
        status.textContent = `\u274C ${msg}`;
      }
      if (typeof appendMessage === "function") {
        appendMessage("system", `\u274C Model switch failed: ${msg}`);
      }
    }
  }
  async function testCurrentModel() {
    const badge = document.getElementById("model-test-badge");
    const status = document.getElementById("model-test-status");
    const btn = document.getElementById("model-test-btn");
    const SPIN = "\u23F3";
    const OK = "\u2705";
    const FAIL = "\u274C";
    const setRunning = () => {
      if (badge) {
        badge.textContent = SPIN;
        badge.style.display = "";
        badge.title = "Testing\u2026";
      }
      if (status) {
        status.innerHTML = `${SPIN} Testing connection\u2026`;
        status.style.display = "";
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = "\u23F3 Testing\u2026";
      }
    };
    const setOk = (latencyMs) => {
      const tip = `Connected \u2014 ${latencyMs}ms`;
      if (badge) {
        badge.textContent = OK;
        badge.style.display = "";
        badge.title = tip;
      }
      if (status) {
        status.innerHTML = `${OK} ${tip}`;
        status.style.color = "#16a34a";
        status.style.display = "";
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "&#10003; Test connection";
      }
      setTimeout(() => {
        if (badge && badge.textContent === OK) badge.style.display = "none";
        if (status && status.textContent.includes(tip)) status.style.display = "none";
      }, 3e4);
    };
    const setFail = (errMsg) => {
      if (badge) {
        badge.textContent = FAIL;
        badge.style.display = "";
        badge.title = errMsg;
      }
      if (status) {
        status.innerHTML = `${FAIL} <span title="${errMsg.replace(/"/g, "&quot;")}" style="cursor:help; text-decoration:underline dotted;">Connection failed</span>`;
        status.style.color = "#dc2626";
        status.style.display = "";
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "&#10003; Test connection";
      }
    };
    setRunning();
    try {
      const result = await apiCall("POST", "/api/model/test");
      if (result.ok) {
        setOk(result.latency_ms);
      } else {
        setFail(result.error || "Unknown error");
      }
    } catch (e) {
      setFail(e.message || String(e));
    }
  }
  function _updatePricingFooter() {
    const el = document.getElementById("pricing-updated-label");
    if (!el || !_modelData) return;
    const ts = _modelData.pricing_updated_at;
    const source = _modelData.pricing_source;
    const sourceLabel = source === "openrouter" ? '<a href="https://openrouter.ai" target="_blank" rel="noopener" style="color:inherit; text-decoration:underline dotted;">OpenRouter</a>' : "static baseline (March 2026)";
    if (!ts) {
      el.innerHTML = `Prices: ${sourceLabel}`;
      return;
    }
    try {
      const d = new Date(ts);
      const now = /* @__PURE__ */ new Date();
      const h = Math.round((now - d) / 36e5);
      const age = h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
      el.innerHTML = `Prices via ${sourceLabel} &middot; updated ${age}`;
    } catch {
      el.innerHTML = `Prices: ${sourceLabel}`;
    }
  }
  async function refreshModelPricing() {
    const btn = document.getElementById("pricing-refresh-btn");
    const lbl = document.getElementById("pricing-updated-label");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Refreshing\u2026";
    }
    try {
      await apiCall("POST", "/api/model-pricing/refresh");
      _modelData = await apiCall("GET", "/api/model");
      _buildModelTable();
    } catch (e) {
      if (lbl) lbl.textContent = "Refresh failed";
      console.error("Pricing refresh failed:", e);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "\u21BB Refresh prices";
      }
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    loadModelSelector();
    const tabBar = document.getElementById("tab-bar");
    const leftBtn = document.getElementById("tab-scroll-left");
    const rightBtn = document.getElementById("tab-scroll-right");
    if (tabBar && leftBtn && rightBtn) {
      leftBtn.addEventListener("click", () => {
        tabBar.scrollBy({ left: -160, behavior: "smooth" });
      });
      rightBtn.addEventListener("click", () => {
        tabBar.scrollBy({ left: 160, behavior: "smooth" });
      });
      tabBar.addEventListener("scroll", updateTabScrollButtons);
      new ResizeObserver(updateTabScrollButtons).observe(tabBar);
    }
    updateTabBarForStage("job");
    if (typeof init === "function") init();
  });

  // web/layout-instruction.js
  var layout_instruction_exports = {};
  __export(layout_instruction_exports, {
    completeLayoutReview: () => completeLayoutReview,
    initiateLayoutInstructions: () => initiateLayoutInstructions
  });
  function initiateLayoutInstructions() {
    const instructionTab = document.getElementById("document-content");
    if (!instructionTab) return;
    if (!instructionTab.querySelector(".layout-instruction-panel")) {
      instructionTab.innerHTML = `
      <div class="layout-instruction-panel">
        <div class="layout-preview-pane">
          <h3>Current Layout Preview</h3>
          <div class="preview-iframe-container">
            <iframe id="layout-preview" class="layout-preview-iframe" title="CV Layout Preview"></iframe>
          </div>
        </div>

        <div class="layout-input-pane">
          <h3>Layout Instructions</h3>
          <p class="layout-scope-label">\u{1F4A1} Layout changes only \u2014 approved text is never modified</p>

          <textarea
            id="instruction-input"
            class="layout-instruction-textarea"
            placeholder="e.g., Move Publications section after Skills&#10;or: Make the Summary section smaller&#10;or: Keep the Genentech entry on one page"
            rows="8"></textarea>

          <button id="apply-instruction-btn" class="btn btn-primary layout-action-btn">
            Apply Instruction
          </button>

          <div id="processing-indicator" class="processing-indicator" style="display: none;">
            <div class="spinner"></div>
            <p>Applying instruction...</p>
          </div>

          <div id="confirmation-message" class="confirmation-message" style="display: none;"></div>

          <div class="layout-history-section">
            <h4>
              <span class="history-toggle">\u25BC</span>
              Instruction History (<span id="instruction-count">0</span>)
            </h4>
            <div id="instruction-history" class="instruction-history-list"></div>
          </div>

          <button id="proceed-to-finalise-btn" class="btn btn-success layout-action-btn" style="display: none;">
            Proceed to Final Generation
          </button>
        </div>
      </div>
    `;
      setupLayoutInstructionListeners();
    }
    const cachedHtml = window.tabData?.cv?.["*.html"] || "";
    if (cachedHtml) {
      displayLayoutPreview(cachedHtml);
    } else {
      _fetchAndDisplayLayoutPreview();
    }
    restoreInstructionHistory();
  }
  function setupLayoutInstructionListeners() {
    const applyBtn = document.getElementById("apply-instruction-btn");
    const proceedBtn = document.getElementById("proceed-to-finalise-btn");
    const instructionInput = document.getElementById("instruction-input");
    const historyToggle = document.querySelector(".history-toggle");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const instruction = instructionInput.value.trim();
        if (!instruction) {
          appendMessage("system", "\u26A0\uFE0F Please enter a layout instruction before submitting.");
          return;
        }
        submitLayoutInstruction(instruction);
      });
    }
    if (proceedBtn) {
      proceedBtn.addEventListener("click", completeLayoutReview);
    }
    if (historyToggle) {
      historyToggle.addEventListener("click", (e) => {
        e.target.textContent = e.target.textContent === "\u25BC" ? "\u25B6" : "\u25BC";
        const historyList = document.getElementById("instruction-history");
        if (historyList) {
          historyList.classList.toggle("collapsed");
        }
      });
    }
    if (instructionInput) {
      instructionInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          applyBtn?.click();
        }
      });
    }
  }
  async function submitLayoutInstruction(instructionText) {
    const currentHtml = window.tabData?.cv?.["*.html"] || "";
    const priorInstructions = window.layoutInstructions || [];
    try {
      showProcessing(true);
      let response;
      const genState = stateManager?.getGenerationState?.() || {};
      const useSessionEndpoint = genState.previewAvailable || genState.phase === "layout_review";
      if (useSessionEndpoint) {
        response = await apiCall("POST", "/api/cv/layout-refine", {
          instruction: instructionText
        });
      } else {
        response = await apiCall("POST", "/api/layout-instruction", {
          instruction: instructionText,
          current_html: currentHtml,
          prior_instructions: priorInstructions
        });
      }
      if (!response.ok) {
        if (response.error === "clarify") {
          showClarificationDialog(response.question, instructionText);
        } else {
          let errorHtml = `\u26A0\uFE0F Error: ${htmlEscape(response.error)} \u2014 ${htmlEscape(response.details || "")}`;
          if (response.raw_response !== void 0) {
            errorHtml += `<br><details style="margin-top:6px"><summary style="cursor:pointer;font-size:0.85em;color:#64748b">Raw LLM response</summary><pre style="font-size:0.75em;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-top:4px">${htmlEscape(response.raw_response || "(empty)")}</pre></details>`;
          }
          appendMessageHtml("system", errorHtml);
        }
        return;
      }
      const newHtml = response.html;
      displayLayoutPreview(newHtml);
      window.tabData.cv["*.html"] = newHtml;
      const instruction = {
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        instruction_text: instructionText,
        change_summary: response.summary,
        confirmation: true
      };
      addToInstructionHistory(instruction);
      showConfirmationMessage(`\u2705 ${response.summary}`);
      document.getElementById("instruction-input").value = "";
      document.getElementById("proceed-to-finalise-btn").style.display = "block";
    } catch (error) {
      appendMessage("system", `\u274C Failed to apply layout instruction: ${error.message}`);
    } finally {
      showProcessing(false);
    }
  }
  async function _fetchAndDisplayLayoutPreview() {
    try {
      const data = await apiCall("POST", "/api/cv/generate-preview", {});
      if (data.ok && data.html) {
        displayLayoutPreview(data.html);
        if (!window.tabData) window.tabData = {};
        if (!window.tabData.cv || typeof window.tabData.cv !== "object") {
          window.tabData.cv = {};
        }
        window.tabData.cv["*.html"] = data.html;
        return;
      }
    } catch (_e) {
    }
    try {
      const data = await apiCall("GET", "/api/layout-html");
      if (data.ok && data.html) {
        displayLayoutPreview(data.html);
        if (!window.tabData) window.tabData = {};
        if (!window.tabData.cv || typeof window.tabData.cv !== "object") {
          window.tabData.cv = {};
        }
        window.tabData.cv["*.html"] = data.html;
      } else {
        console.warn("Layout preview not available:", data.error || "no HTML returned");
      }
    } catch (err) {
      console.warn("Could not load layout preview:", err);
    }
  }
  function displayLayoutPreview(html) {
    const preview = document.getElementById("layout-preview");
    if (!preview) return;
    preview.onload = () => fitLayoutPreviewToPane(preview);
    const doc = preview.contentDocument || preview.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      fitLayoutPreviewToPane(preview);
    }
  }
  function fitLayoutPreviewToPane(preview) {
    const doc = preview?.contentDocument || preview?.contentWindow?.document;
    const container = preview?.closest(".preview-iframe-container");
    if (!doc || !container) return;
    const pageContainer = doc.querySelector(".page-container") || doc.body;
    if (!pageContainer) return;
    const containerWidth = Math.max(container.clientWidth - 24, 1);
    const contentWidth = Math.max(
      Math.ceil(pageContainer.scrollWidth || 0),
      Math.ceil(pageContainer.getBoundingClientRect().width || 0),
      1
    );
    const scale = Math.min(1, containerWidth / contentWidth);
    doc.documentElement.style.background = "#f8fafc";
    doc.body.style.margin = "0";
    doc.body.style.padding = "0";
    doc.body.style.background = "#f8fafc";
    doc.body.style.overflowX = "auto";
    pageContainer.style.zoom = `${scale}`;
    pageContainer.style.transform = "";
    pageContainer.style.transformOrigin = "";
    pageContainer.style.margin = "12px";
    preview.style.minWidth = "";
  }
  function addToInstructionHistory(instruction) {
    if (!window.layoutInstructions) {
      window.layoutInstructions = [];
    }
    window.layoutInstructions.push(instruction);
    renderInstructionHistory();
  }
  function renderInstructionHistory() {
    const historyList = document.getElementById("instruction-history");
    if (!historyList) return;
    historyList.innerHTML = "";
    (window.layoutInstructions || []).forEach((instruction, index) => {
      const entry = document.createElement("div");
      entry.className = "instruction-history-entry";
      entry.innerHTML = `
      <div class="instruction-time">${instruction.timestamp || ""}</div>
      <div class="instruction-text">${htmlEscape(instruction.instruction_text || "")}</div>
      <div class="instruction-summary"><em>${htmlEscape(instruction.change_summary || "")}</em></div>
      <button class="btn btn-small" onclick="undoInstruction(${index})">
        Undo
      </button>
    `;
      historyList.appendChild(entry);
    });
    document.getElementById("instruction-count").textContent = (window.layoutInstructions || []).length;
  }
  function restoreInstructionHistory() {
    renderInstructionHistory();
    const instructions = window.layoutInstructions || [];
    if (instructions.length > 0) {
      document.getElementById("proceed-to-finalise-btn").style.display = "block";
    }
  }
  function showProcessing(show) {
    const indicator = document.getElementById("processing-indicator");
    if (indicator) {
      indicator.style.display = show ? "block" : "none";
    }
  }
  function showConfirmationMessage(message) {
    const element = document.getElementById("confirmation-message");
    if (!element) return;
    element.textContent = message;
    element.style.display = "block";
    setTimeout(() => {
      element.style.display = "none";
    }, 3e3);
  }
  function showClarificationDialog(question, originalInstruction) {
    const response = prompt(
      `The system needs clarification:

${question}

Your original: "${originalInstruction}"

Please clarify:`,
      originalInstruction
    );
    if (response && response !== originalInstruction) {
      submitLayoutInstruction(response);
    }
  }
  window.addEventListener("resize", () => {
    const preview = document.getElementById("layout-preview");
    if (preview) {
      fitLayoutPreviewToPane(preview);
    }
  });
  async function completeLayoutReview() {
    try {
      showProcessing(true);
      const genState = stateManager?.getGenerationState?.() || {};
      if (genState.previewAvailable || genState.phase === "layout_review") {
        try {
          await apiCall("POST", "/api/cv/confirm-layout", {});
        } catch (_e) {
        }
        try {
          const finalRes = await apiCall("POST", "/api/cv/generate-final", {});
          if (finalRes && finalRes.ok && finalRes.outputs) {
            if (!window.tabData) window.tabData = {};
            window.tabData.cv = finalRes.outputs;
            stateManager?.setGenerationState?.({ phase: "final_complete" });
          }
        } catch (_e) {
        }
        if (typeof scheduleAtsRefresh === "function") {
          scheduleAtsRefresh("post_generation");
        }
      }
      const response = await apiCall("POST", "/api/layout-complete", {
        layout_instructions: window.layoutInstructions || []
      });
      if (!response.ok) {
        appendMessage("system", `\u274C Error: ${response.error}`);
        return;
      }
      appendMessage("assistant", "\u2705 Layout confirmed and final output generated.");
      stateManager.setPhase("refinement");
      switchTab("download");
    } catch (error) {
      appendMessage("system", `\u274C Failed to complete layout review: ${error.message}`);
    } finally {
      showProcessing(false);
    }
  }

  // web/src/main.js
  Object.assign(globalThis, utils_exports, api_client_exports, state_manager_exports, ui_core_exports, layout_instruction_exports);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidXRpbHMuanMiLCAiYXBpLWNsaWVudC5qcyIsICJzdGF0ZS1tYW5hZ2VyLmpzIiwgInVpLWNvcmUuanMiLCAibGF5b3V0LWluc3RydWN0aW9uLmpzIiwgInNyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIHV0aWxzLmpzXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgdGV4dCBwcm9jZXNzaW5nLCBmb3JtYXR0aW5nLCBhbmQgZGF0YSBtYW5pcHVsYXRpb24uXG4gKiBObyBkZXBlbmRlbmNpZXMgb24gRE9NIG9yIGNvbXBsZXggc3RhdGUuIFB1cmUgZnVuY3Rpb25zLlxuICovXG5cbi8qKlxuICogTm9ybWFsaXplIHdoaXRlc3BhY2UgaW4gdGV4dDpcbiAqIC0gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuICogLSBDb2xsYXBzZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIHRvIHNpbmdsZSBzcGFjZXNcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplVGV4dCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0XG4gICAgLnRyaW0oKSAgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuICAgIC5yZXBsYWNlKC9cXHMrL2csICcgJykgIC8vIENvbGxhcHNlIGludGVybmFsIHdoaXRlc3BhY2VcbiAgICAudHJpbSgpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBhIFVuaXggdGltZXN0YW1wIGFzIGh1bWFuLXJlYWRhYmxlIGRhdGUgc3RyaW5nLlxuICogRXhhbXBsZTogMTcwOTIzNjgwMCBcdTIxOTIgXCJNYXIgMSwgMjAyNFwiXG4gKi9cbmZ1bmN0aW9uIGZtdERhdGUodHMpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzICogMTAwMCk7XG4gIHJldHVybiBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygnZW4tVVMnLCB7IG1vbnRoOiAnc2hvcnQnLCBkYXk6ICdudW1lcmljJywgeWVhcjogJ251bWVyaWMnIH0pO1xufVxuXG4vKipcbiAqIENsZWFuIEpTT04gcmVzcG9uc2UgYnkgcmVtb3ZpbmcgbWFya2Rvd24gY29kZSBibG9ja3MuXG4gKiBIYW5kbGVzIGNvbW1vbiBwYXR0ZXJuczpcbiAqIC0gYGBganNvbiAuLi4gYGBgXG4gKiAtIGBgYFxuICogICAuLi5cbiAqIGBgYFxuICovXG5mdW5jdGlvbiBjbGVhbkpzb25SZXNwb25zZSh0ZXh0KSB7XG4gIGxldCBjbGVhbmVkID0gdGV4dDtcbiAgLy8gUmVtb3ZlIGBgYGpzb24gd3JhcHBlclxuICBjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9eYGBganNvblxccyovaSwgJycpLnJlcGxhY2UoL2BgYFxccyokL2ksICcnKTtcbiAgLy8gUmVtb3ZlIGBgYCB3cmFwcGVyXG4gIGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL15gYGBcXHMqL2ksICcnKS5yZXBsYWNlKC9gYGBcXHMqJC9pLCAnJyk7XG4gIHJldHVybiBjbGVhbmVkLnRyaW0oKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnMgdG8gcHJldmVudCBpbmplY3Rpb24uXG4gKiBDb252ZXJ0czogJiA8ID4gXCIgJ1xuICovXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQpIHtcbiAgY29uc3QgbWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMDM5OydcbiAgfTtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGl0bGUgYW5kIGNvbXBhbnkgZnJvbSBqb2IgZGVzY3JpcHRpb24gdGV4dC5cbiAqIFBhdHRlcm5zOlxuICogLSBcIlRpdGxlIHwgQ29tcGFueVwiXG4gKiAtIFwiVGl0bGUgYXQgQ29tcGFueVwiXG4gKiAtIEZpcnN0IGxpbmUgY29udGFpbmluZyBcInRpdGxlXCIsIFwicG9zaXRpb25cIiwgXCJyb2xlXCIsIFwiYXJjaGl0ZWN0XCIsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFRpdGxlQW5kQ29tcGFueUZyb21Kb2JUZXh0KGpvYlRleHQpIHtcbiAgY29uc3QgbGluZXMgPSBqb2JUZXh0LnNwbGl0KCdcXG4nKS5tYXAobCA9PiBsLnRyaW0oKSkuZmlsdGVyKGwgPT4gbC5sZW5ndGggPiAwKTtcblxuICAvLyBMb29rIGZvciBwYXR0ZXJuczogXCJUaXRsZSB8IENvbXBhbnlcIiBvciBcIlRpdGxlIGF0IENvbXBhbnlcIlxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBpZiAobGluZS5pbmNsdWRlcygnfCcpKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIGNvbXBhbnldID0gbGluZS5zcGxpdCgnfCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICAgIGlmICh0aXRsZSAmJiBjb21wYW55KSB7XG4gICAgICAgIHJldHVybiB7IHRpdGxlLCBjb21wYW55IH07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJyBhdCAnKSkge1xuICAgICAgY29uc3QgW3RpdGxlLCBjb21wYW55XSA9IGxpbmUuc3BsaXQoL1xccythdFxccysvaSkubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgaWYgKHRpdGxlICYmIGNvbXBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHsgdGl0bGUsIGNvbXBhbnkgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBGYWxsYmFjazogdXNlIGZpcnN0IG5vbi1lbXB0eSBsaW5lIGFzIHRpdGxlXG4gIGNvbnN0IHRpdGxlTGluZSA9IGxpbmVzWzBdO1xuICByZXR1cm4ge1xuICAgIHRpdGxlOiB0aXRsZUxpbmUgfHwgJ1VudGl0bGVkIFBvc2l0aW9uJyxcbiAgICBjb21wYW55OiBsaW5lcy5maW5kKGwgPT4gbC50b0xvd2VyQ2FzZSgpICE9PSB0aXRsZUxpbmUudG9Mb3dlckNhc2UoKSkgfHwgJ1Vua25vd24gQ29tcGFueSdcbiAgfTtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgcG9zaXRpb24gbGFiZWw6XG4gKiAtIENhcGl0YWxpemUgZWFjaCB3b3JkXG4gKiAtIFJlbW92ZSB0cmFpbGluZyBcInJvbGVcIiwgXCJwb3NpdGlvblwiLCBcInRpdGxlXCIsIFwiam9iXCJcbiAqIEV4YW1wbGVzOlxuICogLSBcInNlbmlvciBkYXRhIHNjaWVudGlzdFwiIFx1MjE5MiBcIlNlbmlvciBEYXRhIFNjaWVudGlzdFwiXG4gKiAtIFwiZGlyZWN0b3Igb2YgZW5naW5lZXJpbmdcIiBcdTIxOTIgXCJEaXJlY3RvciBvZiBFbmdpbmVlcmluZ1wiXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBvc2l0aW9uTGFiZWwodGl0bGUsIGNvbXBhbnkpIHtcbiAgbGV0IG5vcm1hbGl6ZWQgPSB0aXRsZVxuICAgIC5zcGxpdCgnICcpXG4gICAgLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCkpXG4gICAgLmpvaW4oJyAnKTtcblxuICAvLyBSZW1vdmUgY29tbW9uIHN1ZmZpeGVzXG4gIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkXG4gICAgLnJlcGxhY2UoL1xccysocm9sZXxwb3NpdGlvbnx0aXRsZXxqb2IpXFxzKiQvaSwgJycpXG4gICAgLnRyaW0oKTtcblxuICByZXR1cm4gbm9ybWFsaXplZCB8fCAnUHJvZmVzc2lvbmFsIFJvbGUnO1xufVxuXG4vKipcbiAqIFN0cmlwIEhUTUwgdGFncyBmcm9tIHN0cmluZy5cbiAqIFJlbW92ZXMgYWxsIDx0YWc+Li4uPC90YWc+IHBhdHRlcm5zLlxuICovXG5mdW5jdGlvbiBzdHJpcEh0bWwoaHRtbCkge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKC88W14+XSo+L2csICcnKTtcbn1cblxuLyoqXG4gKiBUcnVuY2F0ZSB0ZXh0IHRvIG1heCBsZW5ndGggd2l0aCBlbGxpcHNpcy5cbiAqIFByZXNlcnZlcyB3b3JkIGJvdW5kYXJpZXMgd2hlbiBwb3NzaWJsZS5cbiAqL1xuZnVuY3Rpb24gdHJ1bmNhdGVUZXh0KHRleHQsIG1heExlbmd0aCA9IDEwMCkge1xuICBpZiAodGV4dC5sZW5ndGggPD0gbWF4TGVuZ3RoKSByZXR1cm4gdGV4dDtcblxuICAvLyBUcnVuY2F0ZSBhdCBtYXggbGVuZ3RoXG4gIGxldCB0cnVuY2F0ZWQgPSB0ZXh0LnN1YnN0cmluZygwLCBtYXhMZW5ndGgpO1xuXG4gIC8vIFRyeSB0byBmaW5kIHRoZSBsYXN0IHNwYWNlIHRvIGF2b2lkIGN1dHRpbmcgd29yZHNcbiAgY29uc3QgbGFzdFNwYWNlID0gdHJ1bmNhdGVkLmxhc3RJbmRleE9mKCcgJyk7XG4gIGlmIChsYXN0U3BhY2UgPiBNYXRoLmZsb29yKG1heExlbmd0aCAqIDAuNzUpKSB7XG4gICAgdHJ1bmNhdGVkID0gdHJ1bmNhdGVkLnN1YnN0cmluZygwLCBsYXN0U3BhY2UpO1xuICB9XG5cbiAgcmV0dXJuIHRydW5jYXRlZCArICdcdTIwMjYnO1xufVxuXG4vKipcbiAqIENhcGl0YWxpemUgZmlyc3QgbGV0dGVyIG9mIGVhY2ggd29yZC5cbiAqL1xuZnVuY3Rpb24gY2FwaXRhbGl6ZVdvcmRzKHRleHQpIHtcbiAgcmV0dXJuIHRleHRcbiAgICAuc3BsaXQoJyAnKVxuICAgIC5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKS50b0xvd2VyQ2FzZSgpKVxuICAgIC5qb2luKCcgJyk7XG59XG5cbi8qKlxuICogQ29uZGl0aW9uYWwgcGx1cmFsaXphdGlvbiBoZWxwZXIuXG4gKiBFeGFtcGxlOiBwbHVyYWxpemUoMSwgJ2l0ZW0nLCAnaXRlbXMnKSBcdTIxOTIgJ2l0ZW0nXG4gKiAgICAgICAgICBwbHVyYWxpemUoMywgJ2l0ZW0nLCAnaXRlbXMnKSBcdTIxOTIgJ2l0ZW1zJ1xuICovXG5mdW5jdGlvbiBwbHVyYWxpemUoY291bnQsIHNpbmd1bGFyLCBwbHVyYWwpIHtcbiAgcmV0dXJuIGNvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWw7XG59XG5cbi8qKlxuICogSHVtYW4tcmVhZGFibGUgdGltZSBkdXJhdGlvbi5cbiAqIEV4YW1wbGU6IDUwMDAgXHUyMTkyIFwiNSBzZWNvbmRzXCIsIDY1MDAwIFx1MjE5MiBcIjEgbWludXRlXCJcbiAqL1xuZnVuY3Rpb24gZm9ybWF0RHVyYXRpb24obXMpIHtcbiAgY29uc3Qgc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgLyAxMDAwKTtcbiAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDYwKTtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG5cbiAgaWYgKGhvdXJzID4gMCkgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gIGlmIChtaW51dGVzID4gMCkgcmV0dXJuIGAke21pbnV0ZXN9bSAke3NlY29uZHMgJSA2MH1zYDtcbiAgcmV0dXJuIGAke3NlY29uZHN9c2A7XG59XG5cbi8qKlxuICogT3JkaW5hbCBudW1iZXIgc3VmZml4LlxuICogRXhhbXBsZTogMSBcdTIxOTIgXCIxc3RcIiwgMiBcdTIxOTIgXCIybmRcIiwgMyBcdTIxOTIgXCIzcmRcIiwgNCBcdTIxOTIgXCI0dGhcIlxuICovXG5mdW5jdGlvbiBvcmRpbmFsKG4pIHtcbiAgY29uc3QgcyA9IFsndGgnLCAnc3QnLCAnbmQnLCAncmQnXTtcbiAgY29uc3QgdiA9IG4gJSAxMDA7XG4gIHJldHVybiBuICsgKHNbKHYgLSAyMCkgJSAxMF0gfHwgc1t2XSB8fCBzWzBdKTtcbn1cblxuLy8gVXRpbGl0eSBmdW5jdGlvbnMgZm9yIHNlc3Npb24gbWFuYWdlbWVudCBhbmQgZm9ybWF0dGluZ1xuXG4vKipcbiAqIEZvcm1hdCBzZXNzaW9uIHBoYXNlIGxhYmVscy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwaGFzZSAtIFRoZSBwaGFzZSBzdHJpbmcgdG8gZm9ybWF0LlxuICogQHJldHVybnMge3N0cmluZ30gLSBUaGUgZm9ybWF0dGVkIHBoYXNlIGxhYmVsLlxuICovXG5mdW5jdGlvbiBmb3JtYXRTZXNzaW9uUGhhc2VMYWJlbChwaGFzZSkge1xuICBjb25zdCBTRVNTSU9OX1BIQVNFX0xBQkVMUyA9IHtcbiAgICBpbml0OiAnaW5pdCcsXG4gICAgam9iX2FuYWx5c2lzOiAnYW5hbHlzaXMnLFxuICAgIGN1c3RvbWl6YXRpb246ICdjdXN0b21pemF0aW9uJyxcbiAgICByZXdyaXRlX3JldmlldzogJ3Jld3JpdGUnLFxuICAgIHNwZWxsX2NoZWNrOiAnc3BlbGwgY2hlY2snLFxuICAgIGdlbmVyYXRpb246ICdnZW5lcmF0aW9uJyxcbiAgICBsYXlvdXRfcmV2aWV3OiAnbGF5b3V0IHJldmlldycsXG4gICAgcmVmaW5lbWVudDogJ2ZpbmFsaXNlJyxcbiAgfTtcblxuICBpZiAoIXBoYXNlKSByZXR1cm4gJ2luaXQnO1xuICByZXR1cm4gU0VTU0lPTl9QSEFTRV9MQUJFTFNbcGhhc2VdIHx8IFN0cmluZyhwaGFzZSkucmVwbGFjZSgvXy9nLCAnICcpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBzZXNzaW9uIHRpbWVzdGFtcHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGltZXN0YW1wIC0gVGhlIHRpbWVzdGFtcCB0byBmb3JtYXQuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEZvcm1hdHRpbmcgb3B0aW9ucy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaW5jbHVkZVRpbWU9dHJ1ZV0gLSBXaGV0aGVyIHRvIGluY2x1ZGUgdGltZSBpbiB0aGUgb3V0cHV0LlxuICogQHJldHVybnMge3N0cmluZ30gLSBUaGUgZm9ybWF0dGVkIHRpbWVzdGFtcC5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0U2Vzc2lvblRpbWVzdGFtcCh0aW1lc3RhbXAsIHsgaW5jbHVkZVRpbWUgPSB0cnVlIH0gPSB7fSkge1xuICBpZiAoIXRpbWVzdGFtcCkgcmV0dXJuICdcdTIwMTQnO1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lc3RhbXApLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHtcbiAgICAgIG1vbnRoOiAnc2hvcnQnLCBkYXk6ICdudW1lcmljJywgeWVhcjogJ251bWVyaWMnLFxuICAgICAgLi4uKGluY2x1ZGVUaW1lID8geyBob3VyOiAnbnVtZXJpYycsIG1pbnV0ZTogJzItZGlnaXQnIH0gOiB7fSksXG4gICAgfSk7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICByZXR1cm4gU3RyaW5nKHRpbWVzdGFtcCkucmVwbGFjZSgnVCcsICcgJykuc2xpY2UoMCwgaW5jbHVkZVRpbWUgPyAxNiA6IDEwKTtcbiAgfVxufVxuXG5leHBvcnQge1xuICBub3JtYWxpemVUZXh0LCBmbXREYXRlLCBjbGVhbkpzb25SZXNwb25zZSwgZXNjYXBlSHRtbCxcbiAgZXh0cmFjdFRpdGxlQW5kQ29tcGFueUZyb21Kb2JUZXh0LCBub3JtYWxpemVQb3NpdGlvbkxhYmVsLFxuICBzdHJpcEh0bWwsIHRydW5jYXRlVGV4dCwgY2FwaXRhbGl6ZVdvcmRzLCBwbHVyYWxpemUsXG4gIGZvcm1hdER1cmF0aW9uLCBvcmRpbmFsLFxuICBmb3JtYXRTZXNzaW9uUGhhc2VMYWJlbCwgZm9ybWF0U2Vzc2lvblRpbWVzdGFtcCxcbn07XG4iLCAiLyoqXG4gKiBhcGktY2xpZW50LmpzXG4gKiBDZW50cmFsaXplZCBIVFRQIGNvbW11bmljYXRpb24gbGF5ZXIuIEFsbCBBUEkgY2FsbHMgZ28gdGhyb3VnaCBhcGlDYWxsKCkuXG4gKiBQcm92aWRlcyBlcnJvciBoYW5kbGluZywgbG9nZ2luZywgYW5kIHJldHJ5IGxvZ2ljLlxuICovXG5cbi8qKlxuICogQ2VudHJhbGl6ZWQgbG9jYWxTdG9yYWdlIGtleSBtYW5hZ2VtZW50IHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gKi9cbmNvbnN0IFN0b3JhZ2VLZXlzID0ge1xuICBTRVNTSU9OX0lEOiAgICdjdi1idWlsZGVyLXNlc3Npb24taWQnLFxuICBTRVNTSU9OX1BBVEg6ICdjdi1idWlsZGVyLXNlc3Npb24tcGF0aCcsXG4gIFRBQl9EQVRBOiAgICAgJ2N2LWJ1aWxkZXItdGFiLWRhdGEnLFxuICBDVVJSRU5UX1RBQjogICdjdi1idWlsZGVyLWN1cnJlbnQtdGFiJyxcbiAgQ0hBVF9DT0xMQVBTRUQ6ICdjdi1idWlsZGVyLWNoYXQtY29sbGFwc2VkJ1xufTtcblxuY29uc3QgT1dORVJfVE9LRU5fS0VZID0gJ2N2LWJ1aWxkZXItb3duZXItdG9rZW4nO1xuXG5mdW5jdGlvbiBnZXRTZXNzaW9uSWRGcm9tVVJMKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5sb2NhdGlvbikgcmV0dXJuIG51bGw7XG4gIHJldHVybiBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpLmdldCgnc2Vzc2lvbicpO1xufVxuXG5mdW5jdGlvbiBzZXRTZXNzaW9uSWRJblVSTChzZXNzaW9uSWQsIHsgcmVwbGFjZSA9IGZhbHNlIH0gPSB7fSkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5sb2NhdGlvbiB8fCAhd2luZG93Lmhpc3RvcnkgfHwgIXNlc3Npb25JZCkgcmV0dXJuO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3Nlc3Npb24nLCBzZXNzaW9uSWQpO1xuICBpZiAocmVwbGFjZSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgJycsIHVybC50b1N0cmluZygpKTtcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB1cmwudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0T3duZXJUb2tlbigpIHtcbiAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICBsZXQgdG9rZW4gPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKE9XTkVSX1RPS0VOX0tFWSk7XG4gIGlmICghdG9rZW4pIHtcbiAgICBpZiAodHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0b2tlbiA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRva2VuID0gYHRhYi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMiwgMTApfWA7XG4gICAgfVxuICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oT1dORVJfVE9LRU5fS0VZLCB0b2tlbik7XG4gIH1cbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiBnZXRTY29wZWRUYWJEYXRhU3RvcmFnZUtleShzZXNzaW9uSWQgPSBudWxsKSB7XG4gIGNvbnN0IHNjb3BlZFNlc3Npb25JZCA9IHNlc3Npb25JZCB8fCBnZXRTZXNzaW9uSWRGcm9tVVJMKCk7XG4gIHJldHVybiBzY29wZWRTZXNzaW9uSWRcbiAgICA/IGAke1N0b3JhZ2VLZXlzLlRBQl9EQVRBfS0ke3Njb3BlZFNlc3Npb25JZH1gXG4gICAgOiBTdG9yYWdlS2V5cy5UQUJfREFUQTtcbn1cblxuZnVuY3Rpb24gX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHBhdGhuYW1lKSB7XG4gIHJldHVybiBwYXRobmFtZSA9PT0gJy9hcGkvc2Vzc2lvbnMvbmV3J1xuICAgIHx8IHBhdGhuYW1lID09PSAnL2FwaS9zZXNzaW9ucy9jbGFpbSdcbiAgICB8fCBwYXRobmFtZSA9PT0gJy9hcGkvc2Vzc2lvbnMvdGFrZW92ZXInO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRTZXNzaW9uQXdhcmVSZXF1ZXN0KGlucHV0LCBpbml0ID0ge30pIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnIHx8ICF3aW5kb3cubG9jYXRpb24pIHtcbiAgICByZXR1cm4gW2lucHV0LCBpbml0XTtcbiAgfVxuXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IGlucHV0IDogaW5wdXQudXJsLCB3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgaWYgKCF1cmwucGF0aG5hbWUuc3RhcnRzV2l0aCgnL2FwaS8nKSkge1xuICAgIHJldHVybiBbaW5wdXQsIGluaXRdO1xuICB9XG5cbiAgY29uc3Qgb3duZXJUb2tlbiA9IGdldE93bmVyVG9rZW4oKTtcbiAgaWYgKCF1cmwuc2VhcmNoUGFyYW1zLmhhcygnb3duZXJfdG9rZW4nKSAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkgJiYgb3duZXJUb2tlbikge1xuICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KCdvd25lcl90b2tlbicsIG93bmVyVG9rZW4pO1xuICB9XG5cbiAgY29uc3Qgc2Vzc2lvbklkID0gZ2V0U2Vzc2lvbklkRnJvbVVSTCgpO1xuICBpZiAoIXNlc3Npb25JZCkge1xuICAgIHJldHVybiBbdXJsLnRvU3RyaW5nKCksIGluaXRdO1xuICB9XG5cbiAgY29uc3QgbWV0aG9kID0gKGluaXQubWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBuZXh0SW5pdCA9IHsgLi4uaW5pdCB9O1xuICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5pdC5oZWFkZXJzIHx8IHt9KTtcblxuICBpZiAoIXVybC5zZWFyY2hQYXJhbXMuaGFzKCdzZXNzaW9uX2lkJykgJiYgIV9pc1Nlc3Npb25NYW5hZ2VtZW50UGF0aCh1cmwucGF0aG5hbWUpKSB7XG4gICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3Nlc3Npb25faWQnLCBzZXNzaW9uSWQpO1xuICB9XG5cbiAgY29uc3QgbmVlZHNCb2R5Q29udGV4dCA9ICFbJ0dFVCcsICdIRUFEJ10uaW5jbHVkZXMobWV0aG9kKTtcbiAgY29uc3QgYm9keSA9IG5leHRJbml0LmJvZHk7XG4gIGNvbnN0IGlzRm9ybURhdGEgPSB0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YTtcbiAgY29uc3QgaXNVUkxTZWFyY2hQYXJhbXMgPSB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSAndW5kZWZpbmVkJyAmJiBib2R5IGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xuICBjb25zdCBjb250ZW50VHlwZSA9IGhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSB8fCAnJztcblxuICBpZiAobmVlZHNCb2R5Q29udGV4dCAmJiAhaXNGb3JtRGF0YSAmJiAhaXNVUkxTZWFyY2hQYXJhbXMpIHtcbiAgICBsZXQgcGF5bG9hZCA9IHt9O1xuICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycgJiYgYm9keS50cmltKCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gW3VybC50b1N0cmluZygpLCBuZXh0SW5pdF07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChib2R5ID09IG51bGwpIHtcbiAgICAgIHBheWxvYWQgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnb2JqZWN0Jykge1xuICAgICAgcGF5bG9hZCA9IHsgLi4uYm9keSB9O1xuICAgIH1cblxuICAgIGlmIChwYXlsb2FkLnNlc3Npb25faWQgPT0gbnVsbCAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkpIHtcbiAgICAgIHBheWxvYWQuc2Vzc2lvbl9pZCA9IHNlc3Npb25JZDtcbiAgICB9XG4gICAgaWYgKHBheWxvYWQub3duZXJfdG9rZW4gPT0gbnVsbCAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkpIHtcbiAgICAgIGlmIChvd25lclRva2VuKSBwYXlsb2FkLm93bmVyX3Rva2VuID0gb3duZXJUb2tlbjtcbiAgICB9XG5cbiAgICBuZXh0SW5pdC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCk7XG4gICAgaWYgKCFjb250ZW50VHlwZSkge1xuICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgfVxuICB9XG5cbiAgbmV4dEluaXQuaGVhZGVycyA9IGhlYWRlcnM7XG4gIHJldHVybiBbdXJsLnRvU3RyaW5nKCksIG5leHRJbml0XTtcbn1cblxuY29uc3QgX25hdGl2ZUZldGNoID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5mZXRjaCA9PT0gJ2Z1bmN0aW9uJ1xuICA/IHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdylcbiAgOiAodHlwZW9mIGdsb2JhbFRoaXMuZmV0Y2ggPT09ICdmdW5jdGlvbicgPyBnbG9iYWxUaGlzLmZldGNoLmJpbmQoZ2xvYmFsVGhpcykgOiBudWxsKTtcblxuYXN5bmMgZnVuY3Rpb24gc2Vzc2lvbkF3YXJlRmV0Y2goaW5wdXQsIGluaXQgPSB7fSkge1xuICBpZiAoX25hdGl2ZUZldGNoID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZldGNoIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgfVxuICBjb25zdCBbbmV4dElucHV0LCBuZXh0SW5pdF0gPSBfYnVpbGRTZXNzaW9uQXdhcmVSZXF1ZXN0KGlucHV0LCBpbml0KTtcbiAgcmV0dXJuIF9uYXRpdmVGZXRjaChuZXh0SW5wdXQsIG5leHRJbml0KTtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuZmV0Y2ggPT09ICdmdW5jdGlvbicpIHtcbiAgd2luZG93LmZldGNoID0gc2Vzc2lvbkF3YXJlRmV0Y2g7XG59XG5cbi8qKlxuICogQmFzZSBBUEkgY2FsbCBmdW5jdGlvbiB3aXRoIGVycm9yIGhhbmRsaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIEhUVFAgbWV0aG9kIChHRVQsIFBPU1QsIGV0Yy4pXG4gKiBAcGFyYW0ge3N0cmluZ30gZW5kcG9pbnQgLSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvYXBpL3N0YXR1cycpXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFJlcXVlc3QgYm9keSBkYXRhIChmb3IgUE9TVC9QVVQpXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxvYmplY3Q+fSBQYXJzZWQgSlNPTiByZXNwb25zZVxuICovXG5hc3luYyBmdW5jdGlvbiBhcGlDYWxsKG1ldGhvZCwgZW5kcG9pbnQsIGRhdGEgPSBudWxsKSB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9XG4gIH07XG5cbiAgaWYgKGRhdGEgJiYgKG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcpKSB7XG4gICAgb3B0aW9ucy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2Vzc2lvbkF3YXJlRmV0Y2goZW5kcG9pbnQsIG9wdGlvbnMpO1xuXG4gICAgLy8gSGFuZGxlIDQwOSBDb25mbGljdCAoc2Vzc2lvbiBhbHJlYWR5IGFjdGl2ZSlcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgU2Vzc2lvbiBjb25mbGljdCBvbiAke2VuZHBvaW50fWApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXNzaW9uIGFscmVhZHkgYWN0aXZlIGluIGFub3RoZXIgdGFiJyk7XG4gICAgfVxuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIG9uICR7bWV0aG9kfSAke2VuZHBvaW50fTpgLCByZXNwb25zZS5zdGF0dXMsIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQ7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBlcnJvckpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICAgIGlmIChlcnJvckpzb24gJiYgdHlwZW9mIGVycm9ySnNvbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvckpzb24uZXJyb3IgfHwgZXJyb3JKc29uLm1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBzdGF0dXMgdGV4dCB3aGVuIHJlc3BvbnNlIGlzIG5vdCBKU09OLlxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Jlc3BvbnNlLnN0YXR1c306ICR7ZXJyb3JNZXNzYWdlfWApO1xuICAgIH1cblxuICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgQVBJIGNhbGwgZmFpbGVkOiAke21ldGhvZH0gJHtlbmRwb2ludH1gLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb24gTWFuYWdlbWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZFNlc3Npb24oc2Vzc2lvbklkKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCBgL2FwaS9sb2FkLXNlc3Npb24/aWQ9JHtlbmNvZGVVUklDb21wb25lbnQoc2Vzc2lvbklkKX1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbigpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9zZXNzaW9ucy9uZXcnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZGVsZXRlU2Vzc2lvbihzZXNzaW9uSWQpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9kZWxldGUtc2Vzc2lvbicsIHsgc2Vzc2lvbl9pZDogc2Vzc2lvbklkIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFN0YXR1cygpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsICcvYXBpL3N0YXR1cycpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEhpc3RvcnkoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9oaXN0b3J5Jyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNhdmVTZXNzaW9uKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3NhdmUnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jlc2V0Jyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09XG4vLyBKb2IgSW5wdXQgJiBMb2FkaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuXG5hc3luYyBmdW5jdGlvbiB1cGxvYWRKb2JGaWxlKGZvcm1EYXRhKSB7XG4gIC8vIEZvcm1EYXRhIGRvZXNuJ3Qgd29yayB3ZWxsIHdpdGggYXBpQ2FsbCwgdXNlIGRpcmVjdCBmZXRjaCBidXQgd3JhcCBlcnJvciBoYW5kbGluZ1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJy9hcGkvdXBsb2FkLWZpbGUnLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3Igb24gUE9TVCAvYXBpL3VwbG9hZC1maWxlOmAsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgIH1cblxuICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgQVBJIGNhbGwgZmFpbGVkOiBQT1NUIC9hcGkvdXBsb2FkLWZpbGVgLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc3VibWl0Sm9iVGV4dChqb2JUZXh0KSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvam9iJywgeyBqb2JfZGVzY3JpcHRpb246IGpvYlRleHQgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoSm9iRnJvbVVybCh1cmwpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9mZXRjaC1qb2ItdXJsJywgeyB1cmwgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRKb2JGaWxlKHBhdGgpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsIGAvYXBpL2xvYWQtam9iLWZpbGU/cGF0aD0ke2VuY29kZVVSSUNvbXBvbmVudChwYXRoKX1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZEV4aXN0aW5nSXRlbXMoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9sb2FkLWl0ZW1zJyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09XG4vLyBBbmFseXNpc1xuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZUpvYigpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9hY3Rpb24nLCB7IGFjdGlvbjogJ2FuYWx5emVfam9iJyB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNrUG9zdEFuYWx5c2lzUXVlc3Rpb25zKGFuYWx5c2lzRGF0YSkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Bvc3QtYW5hbHlzaXMtcXVlc3Rpb25zJywgeyBhbmFseXNpczogYW5hbHlzaXNEYXRhIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdWJtaXRQb3N0QW5hbHlzaXNBbnN3ZXJzKGFuc3dlcnMpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9wb3N0LWFuYWx5c2lzLXJlc3BvbnNlcycsIHsgYW5zd2VycyB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIE1lc3NhZ2VzICYgQ29udmVyc2F0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuXG5hc3luYyBmdW5jdGlvbiBzZW5kTWVzc2FnZShtZXNzYWdlKSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvbWVzc2FnZScsIHsgbWVzc2FnZSB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2VuZEFjdGlvbihhY3Rpb24sIGRhdGEgPSB7fSkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL2FjdGlvbicsIHsgYWN0aW9uLCAuLi5kYXRhIH0pO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuLy8gQ1YgRGF0YSAmIEVkaXRpbmdcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoQ1ZEYXRhKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnR0VUJywgJy9hcGkvY3YtZGF0YScpO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDVkRhdGEoY3ZEYXRhKSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvY3YtZGF0YScsIHsgY3ZfZGF0YTogY3ZEYXRhIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVFeHBlcmllbmNlKGV4cGVyaWVuY2VJZCwgdXBkYXRlcykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL2V4cGVyaWVuY2UtZGV0YWlscycsIHsgaWQ6IGV4cGVyaWVuY2VJZCwgLi4udXBkYXRlcyB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hFeHBlcmllbmNlRGV0YWlscyhleHBlcmllbmNlSWQpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsIGAvYXBpL2V4cGVyaWVuY2UtZGV0YWlscz9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChleHBlcmllbmNlSWQpfWApO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuLy8gUmVjb21tZW5kYXRpb25zICYgQ3VzdG9taXphdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoUHVibGljYXRpb25SZWNvbW1lbmRhdGlvbnMoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9wdWJsaWNhdGlvbi1yZWNvbW1lbmRhdGlvbnMnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3VibWl0UmV2aWV3RGVjaXNpb25zKGRlY2lzaW9ucykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jldmlldy1kZWNpc2lvbnMnLCBkZWNpc2lvbnMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJld3JpdGVzKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnR0VUJywgJy9hcGkvcmV3cml0ZXMnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXBwcm92ZVJld3JpdGVzKGRlY2lzaW9ucykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jld3JpdGVzL2FwcHJvdmUnLCB7IGRlY2lzaW9ucyB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyYXRpb24gJiBEb3dubG9hZFxuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVDVihvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICBmb3JtYXRzOiBvcHRpb25zLmZvcm1hdHMgfHwgWydhdHNfZG9jeCcsICdodW1hbl9wZGYnLCAnaHVtYW5fZG9jeCddLFxuICAgIC4uLm9wdGlvbnNcbiAgfTtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9nZW5lcmF0ZScsIHBheWxvYWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZEZpbGUoZmlsZW5hbWUpIHtcbiAgLy8gRG93bmxvYWRzIGJ5cGFzcyBKU09OIHBhcnNpbmcgLSByZXR1cm4gYmxvYlxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvYXBpL2Rvd25sb2FkLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gKTtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkOiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gIH1cbiAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlcjogU2V0IExvYWRpbmcgU3RhdGVcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHNldExvYWRpbmcoaXNMb2FkaW5nKSB7XG4gIGxldCBsb2FkaW5nRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2FkaW5nLWluZGljYXRvcicpO1xuICBpZiAoIWxvYWRpbmdFbGVtZW50KSB7XG4gICAgLy8gQ3JlYXRlIGxvYWRpbmcgaW5kaWNhdG9yIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBsb2FkaW5nRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGxvYWRpbmdFbGVtZW50LmlkID0gJ2xvYWRpbmctaW5kaWNhdG9yJztcbiAgICBsb2FkaW5nRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobG9hZGluZ0VsZW1lbnQpO1xuICB9XG4gIGxvYWRpbmdFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc0xvYWRpbmcgPyAnYmxvY2snIDogJ25vbmUnO1xufVxuXG5leHBvcnQge1xuICBTdG9yYWdlS2V5cyxcbiAgT1dORVJfVE9LRU5fS0VZLFxuICBhcGlDYWxsLFxuICBnZXRTZXNzaW9uSWRGcm9tVVJMLFxuICBzZXRTZXNzaW9uSWRJblVSTCxcbiAgZ2V0T3duZXJUb2tlbixcbiAgZ2V0U2NvcGVkVGFiRGF0YVN0b3JhZ2VLZXksXG4gIHNlc3Npb25Bd2FyZUZldGNoLFxuICBsb2FkU2Vzc2lvbiwgZGVsZXRlU2Vzc2lvbiwgZmV0Y2hTdGF0dXMsIGZldGNoSGlzdG9yeSxcbiAgY3JlYXRlU2Vzc2lvbixcbiAgc2F2ZVNlc3Npb24sIHJlc2V0U2Vzc2lvbixcbiAgdXBsb2FkSm9iRmlsZSwgc3VibWl0Sm9iVGV4dCwgZmV0Y2hKb2JGcm9tVXJsLCBsb2FkSm9iRmlsZSwgbG9hZEV4aXN0aW5nSXRlbXMsXG4gIGFuYWx5emVKb2IsIGFza1Bvc3RBbmFseXNpc1F1ZXN0aW9ucywgc3VibWl0UG9zdEFuYWx5c2lzQW5zd2VycyxcbiAgc2VuZE1lc3NhZ2UsIHNlbmRBY3Rpb24sXG4gIGZldGNoQ1ZEYXRhLCB1cGRhdGVDVkRhdGEsIHVwZGF0ZUV4cGVyaWVuY2UsIGZldGNoRXhwZXJpZW5jZURldGFpbHMsXG4gIGZldGNoUHVibGljYXRpb25SZWNvbW1lbmRhdGlvbnMsIHN1Ym1pdFJldmlld0RlY2lzaW9ucyxcbiAgZmV0Y2hSZXdyaXRlcywgYXBwcm92ZVJld3JpdGVzLFxuICBnZW5lcmF0ZUNWLCBkb3dubG9hZEZpbGUsIHNldExvYWRpbmcsXG59O1xuIiwgIi8qKlxuICogc3RhdGUtbWFuYWdlci5qc1xuICogTWFuYWdlcyBzZXNzaW9uIHN0YXRlLCBsb2NhbFN0b3JhZ2UgcGVyc2lzdGVuY2UsIGFuZCBzdGF0ZSBpbml0aWFsaXphdGlvbi5cbiAqIENlbnRyYWxpemVzIGFsbCBzdGF0ZSBtYW5hZ2VtZW50IGxvZ2ljIChjdXJyZW50VGFiLCBpbnRlcmFjdGl2ZVN0YXRlLCBzZXNzaW9uSWQsIGV0Yy4pXG4gKi9cblxuaW1wb3J0IHsgU3RvcmFnZUtleXMgfSBmcm9tICcuL2FwaS1jbGllbnQuanMnO1xuXG4vKipcbiAqIE1pcnJvciBvZiB0aGUgUHl0aG9uIFBoYXNlIGVudW0gaW4gc2NyaXB0cy91dGlscy9jb252ZXJzYXRpb25fbWFuYWdlci5weS5cbiAqIFB5dGhvbiBpcyB0aGUgU09VUkNFIE9GIFRSVVRIIFx1MjAxNCB1cGRhdGUgYm90aCBmaWxlcyB0b2dldGhlciB3aGVuZXZlciBhZGRpbmdcbiAqIG9yIHJlbmFtaW5nIGEgcGhhc2UuXG4gKi9cbmNvbnN0IFBIQVNFUyA9IHtcbiAgSU5JVDogICAgICAgICAgICdpbml0JyxcbiAgSk9CX0FOQUxZU0lTOiAgICdqb2JfYW5hbHlzaXMnLFxuICBDVVNUT01JWkFUSU9OOiAgJ2N1c3RvbWl6YXRpb24nLFxuICBSRVdSSVRFX1JFVklFVzogJ3Jld3JpdGVfcmV2aWV3JyxcbiAgU1BFTExfQ0hFQ0s6ICAgICdzcGVsbF9jaGVjaycsXG4gIEdFTkVSQVRJT046ICAgICAnZ2VuZXJhdGlvbicsXG4gIExBWU9VVF9SRVZJRVc6ICAnbGF5b3V0X3JldmlldycsXG4gIFJFRklORU1FTlQ6ICAgICAncmVmaW5lbWVudCcsXG59O1xuXG4vKipcbiAqIFN0YWdlZCBnZW5lcmF0aW9uIHdvcmtmbG93IHBoYXNlcyAoR0FQLTIwIGltcGxlbWVudGF0aW9uKS5cbiAqIFRoZXNlIHRyYWNrIHRoZSBwcmV2aWV3IFx1MjE5MiBsYXlvdXQtcmV2aWV3IFx1MjE5MiBjb25maXJtZWQgXHUyMTkyIGZpbmFsIHBpcGVsaW5lXG4gKiBpbmRlcGVuZGVudGx5IG9mIHRoZSBtYWluIGNvbnZlcnNhdGlvbiBQSEFTRVMgYWJvdmUuXG4gKiBCYWNrZW5kIHNvdXJjZSBvZiB0cnV0aCBpcyBzZXNzaW9uX2RhdGFbJ2dlbmVyYXRpb25fc3RhdGUnXVsncGhhc2UnXS5cbiAqL1xuY29uc3QgR0VORVJBVElPTl9QSEFTRVMgPSB7XG4gIElETEU6ICAgICAgICAgICAnaWRsZScsICAgICAgICAgICAvLyBObyBwcmV2aWV3IGdlbmVyYXRlZCB5ZXRcbiAgUFJFVklFVzogICAgICAgICdwcmV2aWV3JywgICAgICAgIC8vIEhUTUwgcHJldmlldyBnZW5lcmF0ZWQ7IGluIGxheW91dCByZXZpZXdcbiAgQ09ORklSTUVEOiAgICAgICdjb25maXJtZWQnLCAgICAgIC8vIExheW91dCBjb25maXJtZWQ7IGF3YWl0aW5nIGZpbmFsIG91dHB1dHNcbiAgRklOQUxfQ09NUExFVEU6ICdmaW5hbF9jb21wbGV0ZScsIC8vIEZpbmFsIFBERi9ET0NYIHByb2R1Y2VkXG59O1xuXG4vLyBHbG9iYWwgc3RhdGUgdmFyaWFibGVzIChtb3ZlZCBpbnRvIG1vZHVsZSBmb3IgY2xhcml0eSlcbmxldCBjdXJyZW50VGFiID0gJ2pvYic7XG5sZXQgaXNMb2FkaW5nID0gZmFsc2U7XG5sZXQgdGFiRGF0YSA9IHtcbiAgYW5hbHlzaXM6IG51bGwsXG4gIGN1c3RvbWl6YXRpb25zOiBudWxsLFxuICBjdjogbnVsbFxufTtcbmxldCBpbnRlcmFjdGl2ZVN0YXRlID0ge1xuICBpc1Jldmlld2luZzogZmFsc2UsXG4gIGN1cnJlbnRJbmRleDogMCxcbiAgdHlwZTogbnVsbCwgLy8gJ2V4cGVyaWVuY2VzJyBvciAnc2tpbGxzJ1xuICBkYXRhOiBudWxsXG59O1xubGV0IHNlc3Npb25JZCA9IG51bGw7XG5sZXQgbGFzdEtub3duUGhhc2UgPSBQSEFTRVMuSU5JVDtcbmxldCBpc1JlY29ubmVjdGluZyA9IGZhbHNlO1xuLy8gQ3VycmVudCBtb2RlbC9wcm92aWRlciBzZWxlY3Rpb24gKHBlcnNpc3RlZCB0byBsb2NhbFN0b3JhZ2UpXG5sZXQgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBudWxsO1xubGV0IGN1cnJlbnRNb2RlbE5hbWUgPSBudWxsO1xuXG4vLyBTdGFnZWQgZ2VuZXJhdGlvbiBzdGF0ZSAoR0FQLTIwKTogdHJhY2tzIHByZXZpZXcgXHUyMTkyIGNvbmZpcm0gXHUyMTkyIGZpbmFsIHBpcGVsaW5lLlxuLy8gU3luY2VkIGZyb20gL2FwaS9jdi9nZW5lcmF0aW9uLXN0YXRlIG9uIHBhZ2UgbG9hZCBhbmQgYWZ0ZXIga2V5IHRyYW5zaXRpb25zLlxubGV0IGdlbmVyYXRpb25TdGF0ZSA9IHtcbiAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gIHByZXZpZXdBdmFpbGFibGU6IGZhbHNlLFxuICBsYXlvdXRDb25maXJtZWQ6IGZhbHNlLFxuICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgcGFnZVdhcm5pbmc6IGZhbHNlLFxuICBsYXlvdXRJbnN0cnVjdGlvbnNDb3VudDogMCxcbn07XG5cbi8vIEFUUyBzY29yZSBzdGF0ZSAoR0FQLTIxKTogY2FjaGVkIHNjb3JlIGZyb20gL2FwaS9jdi9hdHMtc2NvcmUuXG4vLyBOdWxsIHVudGlsIGZpcnN0IHNjb3JlIGlzIGZldGNoZWQuXG5sZXQgYXRzU2NvcmUgPSBudWxsO1xuXG4vLyBFeHBvcnQgc3RhdGUgZ2V0dGVycy9zZXR0ZXJzXG5jb25zdCBzdGF0ZU1hbmFnZXIgPSB7XG4gIC8vIFRhYiBzdGF0ZVxuICBnZXRDdXJyZW50VGFiOiAoKSA9PiBjdXJyZW50VGFiLFxuICBzZXRDdXJyZW50VGFiOiAodGFiKSA9PiB7IGN1cnJlbnRUYWIgPSB0YWI7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gTG9hZGluZyBzdGF0ZVxuICBpc0xvYWRpbmc6ICgpID0+IGlzTG9hZGluZyxcbiAgc2V0TG9hZGluZzogKGxvYWRpbmcpID0+IHsgaXNMb2FkaW5nID0gbG9hZGluZzsgfSxcblxuICAvLyBUYWIgZGF0YSAoYW5hbHlzaXMsIGN1c3RvbWl6YXRpb25zLCBDVilcbiAgZ2V0VGFiRGF0YTogKHRhYikgPT4gdGFiRGF0YVt0YWJdLFxuICBzZXRUYWJEYXRhOiAodGFiLCBkYXRhKSA9PiB7IHRhYkRhdGFbdGFiXSA9IGRhdGE7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gSW50ZXJhY3RpdmUgc3RhdGUgKGZvciBleHBlcmllbmNlL3NraWxsIHNlbGVjdGlvbiByZXZpZXcpXG4gIGdldEludGVyYWN0aXZlU3RhdGU6ICgpID0+IGludGVyYWN0aXZlU3RhdGUsXG4gIHNldEludGVyYWN0aXZlU3RhdGU6IChzdGF0ZSkgPT4geyBpbnRlcmFjdGl2ZVN0YXRlID0geyAuLi5pbnRlcmFjdGl2ZVN0YXRlLCAuLi5zdGF0ZSB9OyBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpOyB9LFxuXG4gIC8vIFNlc3Npb24gbWFuYWdlbWVudFxuICBnZXRTZXNzaW9uSWQ6ICgpID0+IHNlc3Npb25JZCxcbiAgc2V0U2Vzc2lvbklkOiAoaWQpID0+IHsgc2Vzc2lvbklkID0gaWQ7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlNFU1NJT05fSUQsIGlkKTsgfSxcblxuICAvLyBNb2RlbC9wcm92aWRlciBzZWxlY3Rpb25cbiAgZ2V0Q3VycmVudE1vZGVsUHJvdmlkZXI6ICgpID0+IGN1cnJlbnRNb2RlbFByb3ZpZGVyLFxuICBnZXRDdXJyZW50TW9kZWxOYW1lOiAoKSA9PiBjdXJyZW50TW9kZWxOYW1lLFxuICBzZXRDdXJyZW50TW9kZWw6IChwcm92aWRlciwgbW9kZWwpID0+IHsgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBwcm92aWRlciB8fCBudWxsOyBjdXJyZW50TW9kZWxOYW1lID0gbW9kZWwgfHwgbnVsbDsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBQaGFzZSB0cmFja2luZ1xuICBnZXRQaGFzZTogKCkgPT4gbGFzdEtub3duUGhhc2UsXG4gIHNldFBoYXNlOiAocGhhc2UpID0+IHsgbGFzdEtub3duUGhhc2UgPSBwaGFzZTsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBQb3N0LWFuYWx5c2lzIHF1ZXN0aW9uc1xuICBnZXRQb3N0QW5hbHlzaXNRdWVzdGlvbnM6ICgpID0+IHdpbmRvdy5wb3N0QW5hbHlzaXNRdWVzdGlvbnMgfHwgW10sXG4gIHNldFBvc3RBbmFseXNpc1F1ZXN0aW9uczogKHF1ZXN0aW9ucykgPT4geyB3aW5kb3cucG9zdEFuYWx5c2lzUXVlc3Rpb25zID0gcXVlc3Rpb25zOyB9LFxuXG4gIC8vIFF1ZXN0aW9uIGFuc3dlcnNcbiAgZ2V0UXVlc3Rpb25BbnN3ZXJzOiAoKSA9PiB3aW5kb3cucXVlc3Rpb25BbnN3ZXJzIHx8IHt9LFxuICBzZXRRdWVzdGlvbkFuc3dlcnM6IChhbnN3ZXJzKSA9PiB7IHdpbmRvdy5xdWVzdGlvbkFuc3dlcnMgPSBhbnN3ZXJzOyB9LFxuXG4gIC8vIFBlbmRpbmcgcmVjb21tZW5kYXRpb25zXG4gIGdldFBlbmRpbmdSZWNvbW1lbmRhdGlvbnM6ICgpID0+IHdpbmRvdy5wZW5kaW5nUmVjb21tZW5kYXRpb25zIHx8IG51bGwsXG4gIHNldFBlbmRpbmdSZWNvbW1lbmRhdGlvbnM6IChyZWMpID0+IHsgd2luZG93LnBlbmRpbmdSZWNvbW1lbmRhdGlvbnMgPSByZWM7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gQVRTIHNjb3JlIHN0YXRlIChHQVAtMjEpXG4gIGdldEF0c1Njb3JlOiAoKSA9PiBhdHNTY29yZSxcbiAgc2V0QXRzU2NvcmU6IChzY29yZSkgPT4geyBhdHNTY29yZSA9IHNjb3JlOyBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpOyB9LFxuICBjbGVhckF0c1Njb3JlOiAoKSA9PiB7IGF0c1Njb3JlID0gbnVsbDsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBTdGFnZWQgZ2VuZXJhdGlvbiBzdGF0ZSAoR0FQLTIwKVxuICBnZXRHZW5lcmF0aW9uU3RhdGU6ICgpID0+IGdlbmVyYXRpb25TdGF0ZSxcbiAgc2V0R2VuZXJhdGlvblN0YXRlOiAodXBkYXRlKSA9PiB7XG4gICAgZ2VuZXJhdGlvblN0YXRlID0geyAuLi5nZW5lcmF0aW9uU3RhdGUsIC4uLnVwZGF0ZSB9O1xuICAgIHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XG4gIH0sXG4gIHJlc2V0R2VuZXJhdGlvblN0YXRlOiAoKSA9PiB7XG4gICAgZ2VuZXJhdGlvblN0YXRlID0ge1xuICAgICAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gICAgICBwcmV2aWV3QXZhaWxhYmxlOiBmYWxzZSxcbiAgICAgIGxheW91dENvbmZpcm1lZDogZmFsc2UsXG4gICAgICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgICAgIHBhZ2VXYXJuaW5nOiBmYWxzZSxcbiAgICAgIGxheW91dEluc3RydWN0aW9uc0NvdW50OiAwLFxuICAgIH07XG4gICAgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTtcbiAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBmcmVzaCBzdGF0ZSBvYmplY3Qgd2l0aCBhbGwgZGVmYXVsdCB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVTdGF0ZSgpIHtcbiAgY3VycmVudFRhYiA9ICdqb2InO1xuICBpc0xvYWRpbmcgPSBmYWxzZTtcbiAgdGFiRGF0YSA9IHtcbiAgICBhbmFseXNpczogbnVsbCxcbiAgICBjdXN0b21pemF0aW9uczogbnVsbCxcbiAgICBjdjogbnVsbFxuICB9O1xuICBpbnRlcmFjdGl2ZVN0YXRlID0ge1xuICAgIGlzUmV2aWV3aW5nOiBmYWxzZSxcbiAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgdHlwZTogbnVsbCxcbiAgICBkYXRhOiBudWxsXG4gIH07XG4gIHdpbmRvdy5wb3N0QW5hbHlzaXNRdWVzdGlvbnMgPSBbXTtcbiAgd2luZG93LnF1ZXN0aW9uQW5zd2VycyA9IHt9O1xuICBsYXN0S25vd25QaGFzZSA9IFBIQVNFUy5JTklUO1xuICBnZW5lcmF0aW9uU3RhdGUgPSB7XG4gICAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gICAgcHJldmlld0F2YWlsYWJsZTogZmFsc2UsXG4gICAgbGF5b3V0Q29uZmlybWVkOiBmYWxzZSxcbiAgICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgICBwYWdlV2FybmluZzogZmFsc2UsXG4gICAgbGF5b3V0SW5zdHJ1Y3Rpb25zQ291bnQ6IDAsXG4gIH07XG5cbiAgLy8gR2V0IG9yIGdlbmVyYXRlIHNlc3Npb24gSURcbiAgbGV0IHN0b3JlZElkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU3RvcmFnZUtleXMuU0VTU0lPTl9JRCk7XG4gIGlmICghc3RvcmVkSWQpIHtcbiAgICBzdG9yZWRJZCA9ICdzZXNzaW9uLScgKyBEYXRlLm5vdygpICsgJy0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlNFU1NJT05fSUQsIHN0b3JlZElkKTtcbiAgfVxuICBzZXNzaW9uSWQgPSBzdG9yZWRJZDtcblxuICBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpO1xufVxuXG4vKipcbiAqIExvYWQgc3RhdGUgZnJvbSBicm93c2VyIGxvY2FsU3RvcmFnZS5cbiAqL1xuZnVuY3Rpb24gbG9hZFN0YXRlRnJvbUxvY2FsU3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzYXZlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBKTtcbiAgICBpZiAoIXNhdmVkKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShzYXZlZCk7XG5cbiAgICAvLyBPbmx5IHJlc3RvcmUgaWYgZGF0YSBpcyByZWNlbnQgKHdpdGhpbiAyNCBob3VycylcbiAgICBjb25zdCBhZ2UgPSBEYXRlLm5vdygpIC0gKGRhdGEudGltZXN0YW1wIHx8IDApO1xuICAgIGlmIChhZ2UgPiAyNCAqIDYwICogNjAgKiAxMDAwKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShTdG9yYWdlS2V5cy5UQUJfREFUQSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gUmVzdG9yZSB0YWIgZGF0YVxuICAgIGlmIChkYXRhLnRhYkRhdGEpIHtcbiAgICAgIHRhYkRhdGEgPSB7IC4uLnRhYkRhdGEsIC4uLmRhdGEudGFiRGF0YSB9O1xuICAgIH1cblxuICAgIC8vIFJlc3RvcmUgaW50ZXJhY3RpdmUgc3RhdGVcbiAgICBpZiAoZGF0YS5pbnRlcmFjdGl2ZVN0YXRlKSB7XG4gICAgICBpbnRlcmFjdGl2ZVN0YXRlID0geyAuLi5pbnRlcmFjdGl2ZVN0YXRlLCAuLi5kYXRhLmludGVyYWN0aXZlU3RhdGUgfTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHBlbmRpbmcgcmVjb21tZW5kYXRpb25zXG4gICAgaWYgKGRhdGEucGVuZGluZ1JlY29tbWVuZGF0aW9ucykge1xuICAgICAgd2luZG93LnBlbmRpbmdSZWNvbW1lbmRhdGlvbnMgPSBkYXRhLnBlbmRpbmdSZWNvbW1lbmRhdGlvbnM7XG4gICAgfVxuXG4gICAgLy8gUmVzdG9yZSBzYXZlZCBtb2RlbC9wcm92aWRlciBzZWxlY3Rpb25cbiAgICBpZiAoZGF0YS5jdXJyZW50TW9kZWxQcm92aWRlcikge1xuICAgICAgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBkYXRhLmN1cnJlbnRNb2RlbFByb3ZpZGVyO1xuICAgIH1cbiAgICBpZiAoZGF0YS5jdXJyZW50TW9kZWxOYW1lKSB7XG4gICAgICBjdXJyZW50TW9kZWxOYW1lID0gZGF0YS5jdXJyZW50TW9kZWxOYW1lO1xuICAgIH1cblxuICAgIC8vIFJlc3RvcmUgcG9zdC1hbmFseXNpcyBzdGF0ZVxuICAgIGlmIChkYXRhLnBvc3RBbmFseXNpc1F1ZXN0aW9ucykge1xuICAgICAgd2luZG93LnBvc3RBbmFseXNpc1F1ZXN0aW9ucyA9IGRhdGEucG9zdEFuYWx5c2lzUXVlc3Rpb25zO1xuICAgIH1cbiAgICBpZiAoZGF0YS5xdWVzdGlvbkFuc3dlcnMpIHtcbiAgICAgIHdpbmRvdy5xdWVzdGlvbkFuc3dlcnMgPSBkYXRhLnF1ZXN0aW9uQW5zd2VycztcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHBoYXNlXG4gICAgaWYgKGRhdGEubGFzdEtub3duUGhhc2UpIHtcbiAgICAgIGxhc3RLbm93blBoYXNlID0gZGF0YS5sYXN0S25vd25QaGFzZTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHN0YWdlZCBnZW5lcmF0aW9uIHN0YXRlXG4gICAgaWYgKGRhdGEuZ2VuZXJhdGlvblN0YXRlKSB7XG4gICAgICBnZW5lcmF0aW9uU3RhdGUgPSB7IC4uLmdlbmVyYXRpb25TdGF0ZSwgLi4uZGF0YS5nZW5lcmF0aW9uU3RhdGUgfTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIEFUUyBzY29yZVxuICAgIGlmIChkYXRhLmF0c1Njb3JlKSB7XG4gICAgICBhdHNTY29yZSA9IGRhdGEuYXRzU2NvcmU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCBzdGF0ZSBmcm9tIGxvY2FsU3RvcmFnZTonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogU2F2ZSBjdXJyZW50IHN0YXRlIHRvIGJyb3dzZXIgbG9jYWxTdG9yYWdlLlxuICovXG5mdW5jdGlvbiBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhVG9TYXZlID0ge1xuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgdGFiRGF0YSxcbiAgICAgIGludGVyYWN0aXZlU3RhdGUsXG4gICAgICBwZW5kaW5nUmVjb21tZW5kYXRpb25zOiB3aW5kb3cucGVuZGluZ1JlY29tbWVuZGF0aW9ucyxcbiAgICAgIHBvc3RBbmFseXNpc1F1ZXN0aW9uczogd2luZG93LnBvc3RBbmFseXNpc1F1ZXN0aW9ucyxcbiAgICAgIHF1ZXN0aW9uQW5zd2Vyczogd2luZG93LnF1ZXN0aW9uQW5zd2VycyxcbiAgICAgIGxhc3RLbm93blBoYXNlLFxuICAgICAgY3VycmVudFRhYixcbiAgICAgIC8vIFBlcnNpc3QgbGFzdC1zZWxlY3RlZCBtb2RlbC9wcm92aWRlciBzbyBVSSBzZWxlY3Rpb25zIHN1cnZpdmUgcmVsb2Fkc1xuICAgICAgY3VycmVudE1vZGVsUHJvdmlkZXIsXG4gICAgICBjdXJyZW50TW9kZWxOYW1lLFxuICAgICAgZ2VuZXJhdGlvblN0YXRlLFxuICAgICAgYXRzU2NvcmUsXG4gICAgfTtcblxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBLCBKU09OLnN0cmluZ2lmeShkYXRhVG9TYXZlKSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gc2F2ZSBzdGF0ZSB0byBsb2NhbFN0b3JhZ2U6JywgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogQ2xlYXIgYWxsIHN0YXRlIChvbiBuZXcgc2Vzc2lvbiBvciByZXNldCBhY3Rpb24pLlxuICovXG5mdW5jdGlvbiBjbGVhclN0YXRlKCkge1xuICBpbml0aWFsaXplU3RhdGUoKTtcbiAgT2JqZWN0LnZhbHVlcyhTdG9yYWdlS2V5cykuZm9yRWFjaChrZXkgPT4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KSk7XG59XG5cbi8vIFRoZSBhdXRob3JpdGF0aXZlIHJlc3RvcmVTZXNzaW9uL3Jlc3RvcmVCYWNrZW5kU3RhdGUvbG9hZFNlc3Npb25GaWxlXG4vLyBpbXBsZW1lbnRhdGlvbnMgbGl2ZSBpbiBgd2ViL2FwcC5qc2AuIFJlbW92ZSBkdXBsaWNhdGUgaW1wbGVtZW50YXRpb25zXG4vLyBmcm9tIHRoaXMgbW9kdWxlIHRvIGF2b2lkIGNvbmZsaWN0aW5nIGJlaGF2aW9yIGFuZCBlbnN1cmUgYSBzaW5nbGVcbi8vIHJlc3RvcmUgcGF0aCBpcyB1c2VkIGJ5IHRoZSBhcHBsaWNhdGlvbi5cblxuZXhwb3J0IHtcbiAgUEhBU0VTLFxuICBHRU5FUkFUSU9OX1BIQVNFUyxcbiAgc3RhdGVNYW5hZ2VyLFxuICBpbml0aWFsaXplU3RhdGUsIGxvYWRTdGF0ZUZyb21Mb2NhbFN0b3JhZ2UsIHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlLFxuICBjbGVhclN0YXRlLFxufTtcbiIsICIvKipcbiAqIHVpLWNvcmUuanNcbiAqIENvcmUgVUkgcm91dGluZywgdGFiIG1hbmFnZW1lbnQsIG1vZGFsIG1hbmFnZW1lbnQsIGFuZCBwYWdlIGluaXRpYWxpemF0aW9uLlxuICogRW50cnkgcG9pbnQgZm9yIHRoZSBhcHBsaWNhdGlvbiAtIGxvYWRzIG9uIERPTUNvbnRlbnRMb2FkZWQuXG4gKi9cblxuaW1wb3J0IHsgZXNjYXBlSHRtbCB9IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IHsgU3RvcmFnZUtleXMsIGFwaUNhbGwsIGZldGNoU3RhdHVzLCBhc2tQb3N0QW5hbHlzaXNRdWVzdGlvbnMsIHNlbmRNZXNzYWdlIH0gZnJvbSAnLi9hcGktY2xpZW50LmpzJztcbmltcG9ydCB7IGluaXRpYWxpemVTdGF0ZSwgbG9hZFN0YXRlRnJvbUxvY2FsU3RvcmFnZSB9IGZyb20gJy4vc3RhdGUtbWFuYWdlci5qcyc7XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQWNjZXNzaWJpbGl0eTogRm9jdXMgTWFuYWdlbWVudCBmb3IgTW9kYWxzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIFN0b3JlcyB0aGUgZWxlbWVudCB0aGF0IG9wZW5lZCB0aGUgY3VycmVudCBtb2RhbCAoZm9yIGZvY3VzIHJlc3RvcmF0aW9uIG9uIGNsb3NlKS4gKi9cbmxldCBfZm9jdXNlZEVsZW1lbnRCZWZvcmVNb2RhbCA9IG51bGw7XG5cbi8qKiBTdG9yZXMgdGhlIGN1cnJlbnQga2V5ZG93biBsaXN0ZW5lciBmb3IgZm9jdXMgdHJhcCAodG8gZW5hYmxlIGNsZWFudXApLiAqL1xubGV0IF9jdXJyZW50Rm9jdXNUcmFwTGlzdGVuZXIgPSBudWxsO1xuXG4vKipcbiAqIEdldCBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiBhIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIFRoZSBtb2RhbCBvciBjb250YWluZXIgZWxlbWVudFxuICogQHJldHVybnMge0hUTUxFbGVtZW50W119IEFycmF5IG9mIGZvY3VzYWJsZSBlbGVtZW50c1xuICovXG5mdW5jdGlvbiBnZXRGb2N1c2FibGVFbGVtZW50cyhjb250YWluZXIpIHtcbiAgY29uc3QgZm9jdXNhYmxlU2VsZWN0b3JzID0gW1xuICAgICdhW2hyZWZdJywgJ2J1dHRvbjpub3QoW2Rpc2FibGVkXSknLCAnaW5wdXQ6bm90KFtkaXNhYmxlZF0pJyxcbiAgICAndGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pJywgJ3NlbGVjdDpub3QoW2Rpc2FibGVkXSknLFxuICAgICdbdGFiaW5kZXhdOm5vdChbdGFiaW5kZXg9XCItMVwiXSknLFxuICBdLmpvaW4oJywgJyk7XG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKGZvY3VzYWJsZVNlbGVjdG9ycykpO1xufVxuXG4vKipcbiAqIFNldCBpbml0aWFsIGZvY3VzIHRvIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudCBpbiBhIG1vZGFsLlxuICogUHJpb3JpdGl6ZXMgZWxlbWVudHMgd2l0aCBpZD1cIlttb2RhbElkXS1mb2N1cy10YXJnZXRcIiBpZiBwcmVzZW50LlxuICogQHBhcmFtIHtzdHJpbmd9IG1vZGFsSWQgLSBJRCBvZiB0aGUgbW9kYWxcbiAqL1xuZnVuY3Rpb24gc2V0SW5pdGlhbEZvY3VzKG1vZGFsSWQpIHtcbiAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RhbElkKTtcbiAgaWYgKCFtb2RhbCkgcmV0dXJuO1xuXG4gIC8vIFRyeSB0byBmb2N1cyBhbiBleHBsaWNpdCB0YXJnZXQgKGUuZy4sIGlucHV0IGZpZWxkIHdpdGggY2xhc3MvaWQpXG4gIGNvbnN0IGZvY3VzVGFyZ2V0ID0gbW9kYWwucXVlcnlTZWxlY3RvcignW2RhdGEtZm9jdXMtdGFyZ2V0PVwidHJ1ZVwiXScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgbW9kYWwucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cInRleHRcIl0nKSB8fFxuICAgICAgICAgICAgICAgICAgICAgIG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbicpO1xuXG4gIGlmIChmb2N1c1RhcmdldCkge1xuICAgIC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSBtb2RhbCByZW5kZXIgKyBhY3R1YWwgZGlzcGxheVxuICAgIHNldFRpbWVvdXQoKCkgPT4gZm9jdXNUYXJnZXQuZm9jdXMoKSwgNTApO1xuICB9XG59XG5cbi8qKlxuICogVHJhcCBmb2N1cyB3aXRoaW4gYSBtb2RhbCB1c2luZyBUYWIvU2hpZnQrVGFiLlxuICogUHJldmVudHMgdXNlciB0YWJiaW5nIHRvIGVsZW1lbnRzIG91dHNpZGUgdGhlIG1vZGFsLlxuICogQHBhcmFtIHtzdHJpbmd9IG1vZGFsSWQgLSBJRCBvZiB0aGUgbW9kYWxcbiAqL1xuZnVuY3Rpb24gdHJhcEZvY3VzKG1vZGFsSWQpIHtcbiAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RhbElkKTtcbiAgaWYgKCFtb2RhbCkgcmV0dXJuO1xuXG4gIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgdHJhcCBsaXN0ZW5lclxuICBpZiAoX2N1cnJlbnRGb2N1c1RyYXBMaXN0ZW5lcikge1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBfY3VycmVudEZvY3VzVHJhcExpc3RlbmVyKTtcbiAgfVxuXG4gIGNvbnN0IGZvY3VzYWJsZUVsZW1lbnRzID0gZ2V0Rm9jdXNhYmxlRWxlbWVudHMobW9kYWwpO1xuICBpZiAoZm9jdXNhYmxlRWxlbWVudHMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgY29uc3QgZmlyc3RFbGVtZW50ID0gZm9jdXNhYmxlRWxlbWVudHNbMF07XG4gIGNvbnN0IGxhc3RFbGVtZW50ID0gZm9jdXNhYmxlRWxlbWVudHNbZm9jdXNhYmxlRWxlbWVudHMubGVuZ3RoIC0gMV07XG5cbiAgX2N1cnJlbnRGb2N1c1RyYXBMaXN0ZW5lciA9IChlKSA9PiB7XG4gICAgaWYgKGUua2V5ICE9PSAnVGFiJykgcmV0dXJuO1xuXG4gICAgY29uc3QgaXNTaGlmdCA9IGUuc2hpZnRLZXk7XG4gICAgY29uc3QgYWN0aXZlRWwgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuXG4gICAgaWYgKGlzU2hpZnQpIHtcbiAgICAgIC8vIFNoaWZ0K1RhYiBmcm9tIGZpcnN0IGVsZW1lbnQgXHUyMTkyIGZvY3VzIGxhc3QgZWxlbWVudFxuICAgICAgaWYgKGFjdGl2ZUVsID09PSBmaXJzdEVsZW1lbnQpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBsYXN0RWxlbWVudC5mb2N1cygpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUYWIgZnJvbSBsYXN0IGVsZW1lbnQgXHUyMTkyIGZvY3VzIGZpcnN0IGVsZW1lbnRcbiAgICAgIGlmIChhY3RpdmVFbCA9PT0gbGFzdEVsZW1lbnQpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBmaXJzdEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIF9jdXJyZW50Rm9jdXNUcmFwTGlzdGVuZXIpO1xufVxuXG4vKipcbiAqIFJlc3RvcmUgZm9jdXMgdG8gdGhlIGVsZW1lbnQgdGhhdCBvcGVuZWQgdGhlIG1vZGFsLlxuICovXG5mdW5jdGlvbiByZXN0b3JlRm9jdXMoKSB7XG4gIGlmIChfZm9jdXNlZEVsZW1lbnRCZWZvcmVNb2RhbCAmJiB0eXBlb2YgX2ZvY3VzZWRFbGVtZW50QmVmb3JlTW9kYWwuZm9jdXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBfZm9jdXNlZEVsZW1lbnRCZWZvcmVNb2RhbC5mb2N1cygpO1xuICB9XG4gIF9mb2N1c2VkRWxlbWVudEJlZm9yZU1vZGFsID0gbnVsbDtcblxuICAvLyBDbGVhbiB1cCBmb2N1cyB0cmFwIGxpc3RlbmVyXG4gIGlmIChfY3VycmVudEZvY3VzVHJhcExpc3RlbmVyKSB7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIF9jdXJyZW50Rm9jdXNUcmFwTGlzdGVuZXIpO1xuICAgIF9jdXJyZW50Rm9jdXNUcmFwTGlzdGVuZXIgPSBudWxsO1xuICB9XG59XG5cbi8qKiBNYXBzIGVhY2ggd29ya2Zsb3cgc3RhZ2UgKHRvcCBiYXIpIHRvIHRoZSB0YWJzIHNob3duIGluIHRoZSBzZWNvbmQgbmF2IGJhci4gKi9cbmNvbnN0IFNUQUdFX1RBQlMgPSB7XG4gIGpvYjogICAgICAgICAgICBbJ2pvYiddLFxuICBhbmFseXNpczogICAgICAgWydhbmFseXNpcycsICdxdWVzdGlvbnMnXSxcbiAgY3VzdG9taXphdGlvbnM6IFsnZXhwLXJldmlldycsICdhY2gtZWRpdG9yJywgJ3NraWxscy1yZXZpZXcnLCAnYWNoaWV2ZW1lbnRzLXJldmlldycsICdzdW1tYXJ5LXJldmlldycsICdwdWJsaWNhdGlvbnMtcmV2aWV3J10sXG4gIHJld3JpdGU6ICAgICAgICBbJ3Jld3JpdGUnXSxcbiAgc3BlbGw6ICAgICAgICAgIFsnc3BlbGwnXSxcbiAgZ2VuZXJhdGU6ICAgICAgIFsnZ2VuZXJhdGUnXSxcbiAgbGF5b3V0OiAgICAgICAgIFsnbGF5b3V0J10sXG4gIGZpbmFsaXNlOiAgICAgICBbJ2Rvd25sb2FkJywgJ2ZpbmFsaXNlJywgJ21hc3RlcicsICdjb3Zlci1sZXR0ZXInLCAnc2NyZWVuaW5nJ10sXG59O1xuXG4vKiogQ3VycmVudGx5IGFjdGl2ZSBzdGFnZSBcdTIwMTQgZHJpdmVzIHNlY29uZC1iYXIgdGFiIHZpc2liaWxpdHkuICovXG5sZXQgY3VycmVudFN0YWdlID0gJ2pvYic7XG5cbi8qKlxuICogQ3VzdG9tIGNvbmZpcm0gZGlhbG9nIFx1MjAxNCByZXR1cm5zIGEgUHJvbWlzZTxib29sZWFuPi5cbiAqIFJlcGxhY2VzIGJyb3dzZXIgY29uZmlybSgpIHdoaWNoIGNhbiBiZSBzaWxlbnRseSBzdXBwcmVzc2VkIG9uY2UgdGhlIHVzZXJcbiAqIGNoZWNrcyBcIlByZXZlbnQgdGhpcyBwYWdlIGZyb20gY3JlYXRpbmcgYWRkaXRpb25hbCBkaWFsb2dzXCIuXG4gKlxuICogVXNhZ2U6ICBpZiAoYXdhaXQgY29uZmlybURpYWxvZygnQXJlIHlvdSBzdXJlPycpKSB7IC4uLiB9XG4gKi9cbmZ1bmN0aW9uIGNvbmZpcm1EaWFsb2cobWVzc2FnZSwgeyBjb25maXJtTGFiZWwgPSAnT0snLCBjYW5jZWxMYWJlbCA9ICdDYW5jZWwnLCBkYW5nZXIgPSBmYWxzZSB9ID0ge30pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIC8vIFJldXNlIG9yIGNyZWF0ZSB0aGUgc2hhcmVkIG92ZXJsYXkgZWxlbWVudFxuICAgIGxldCBvdmVybGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm0tZGlhbG9nLW92ZXJsYXknKTtcbiAgICBpZiAoIW92ZXJsYXkpIHtcbiAgICAgIG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG92ZXJsYXkuaWQgPSAnY29uZmlybS1kaWFsb2ctb3ZlcmxheSc7XG4gICAgICBvdmVybGF5LnN0eWxlLmNzc1RleHQgPVxuICAgICAgICAnZGlzcGxheTpub25lOyBwb3NpdGlvbjpmaXhlZDsgaW5zZXQ6MDsgYmFja2dyb3VuZDpyZ2JhKDAsMCwwLDAuNDUpOyB6LWluZGV4Ojk5OTk7JyArXG4gICAgICAgICdhbGlnbi1pdGVtczpjZW50ZXI7IGp1c3RpZnktY29udGVudDpjZW50ZXI7JztcbiAgICAgIG92ZXJsYXkuaW5uZXJIVE1MID1cbiAgICAgICAgJzxkaXYgaWQ9XCJjb25maXJtLWRpYWxvZy1ib3hcIiBzdHlsZT1cImJhY2tncm91bmQ6I2ZmZjsgYm9yZGVyLXJhZGl1czo4cHg7IHBhZGRpbmc6MjRweCAyOHB4OycgK1xuICAgICAgICAnbWF4LXdpZHRoOjQwMHB4OyB3aWR0aDo5MCU7IGJveC1zaGFkb3c6MCA4cHggMzJweCByZ2JhKDAsMCwwLDAuMTgpOyBmb250LWZhbWlseTppbmhlcml0O1wiPicgK1xuICAgICAgICAnPHAgaWQ9XCJjb25maXJtLWRpYWxvZy1tc2dcIiBzdHlsZT1cIm1hcmdpbjowIDAgMjBweDsgZm9udC1zaXplOjAuOTVlbTsgY29sb3I6IzFlMjkzYjsgd2hpdGUtc3BhY2U6cHJlLXdyYXA7XCI+PC9wPicgK1xuICAgICAgICAnPGRpdiBzdHlsZT1cImRpc3BsYXk6ZmxleDsgZ2FwOjhweDsganVzdGlmeS1jb250ZW50OmZsZXgtZW5kO1wiPicgK1xuICAgICAgICAnPGJ1dHRvbiBpZD1cImNvbmZpcm0tZGlhbG9nLWNhbmNlbFwiIHN0eWxlPVwicGFkZGluZzo2cHggMTZweDsgYm9yZGVyOjFweCBzb2xpZCAjY2JkNWUxOycgK1xuICAgICAgICAnYm9yZGVyLXJhZGl1czo1cHg7IGJhY2tncm91bmQ6I2Y4ZmFmYzsgY3Vyc29yOnBvaW50ZXI7IGNvbG9yOiM0NzU1Njk7XCI+PC9idXR0b24+JyArXG4gICAgICAgICc8YnV0dG9uIGlkPVwiY29uZmlybS1kaWFsb2ctb2tcIiBzdHlsZT1cInBhZGRpbmc6NnB4IDE2cHg7IGJvcmRlcjpub25lOycgK1xuICAgICAgICAnYm9yZGVyLXJhZGl1czo1cHg7IGN1cnNvcjpwb2ludGVyOyBjb2xvcjojZmZmOyBmb250LXdlaWdodDo2MDA7XCI+PC9idXR0b24+JyArXG4gICAgICAgICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChvdmVybGF5KTtcbiAgICB9XG5cbiAgICBjb25zdCBva0J0biAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1kaWFsb2ctb2snKTtcbiAgICBjb25zdCBjYW5jZWxCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1kaWFsb2ctY2FuY2VsJyk7XG4gICAgY29uc3QgbXNnRWwgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm0tZGlhbG9nLW1zZycpO1xuXG4gICAgbXNnRWwudGV4dENvbnRlbnQgICAgICAgICAgPSBtZXNzYWdlO1xuICAgIG9rQnRuLnRleHRDb250ZW50ICAgICAgICAgID0gY29uZmlybUxhYmVsO1xuICAgIGNhbmNlbEJ0bi50ZXh0Q29udGVudCAgICAgID0gY2FuY2VsTGFiZWw7XG4gICAgb2tCdG4uc3R5bGUuYmFja2dyb3VuZCAgICAgPSBkYW5nZXIgPyAnI2RjMjYyNicgOiAnIzNiODJmNic7XG5cbiAgICBvdmVybGF5LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG5cbiAgICBjb25zdCBmaW5pc2ggPSAocmVzdWx0KSA9PiB7XG4gICAgICBvdmVybGF5LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAvLyBSZW1vdmUgbGlzdGVuZXJzIHRvIGF2b2lkIHN0YWNraW5nIGhhbmRsZXJzXG4gICAgICBva0J0bi5yZXBsYWNlV2l0aChva0J0bi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgY2FuY2VsQnRuLnJlcGxhY2VXaXRoKGNhbmNlbEJ0bi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH07XG5cbiAgICAvLyBSZWJpbmQgY2xvbmVkIGJ1dHRvbnNcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1kaWFsb2ctb2snKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICAgICAoKSA9PiBmaW5pc2godHJ1ZSksICB7IG9uY2U6IHRydWUgfSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm0tZGlhbG9nLWNhbmNlbCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gZmluaXNoKGZhbHNlKSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIG92ZXJsYXkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHsgaWYgKGUudGFyZ2V0ID09PSBvdmVybGF5KSBmaW5pc2goZmFsc2UpOyB9LCB7IG9uY2U6IHRydWUgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEdsb2JhbCBmZXRjaCBpbnRlcmNlcHRvciBcdTIwMTQgc2hvd3MgYW1iZXIgYmFubmVyIG9uIDQwOSBDb25mbGljdCAoc2Vzc2lvbiBhbHJlYWR5IGFjdGl2ZSkuXG4gKi9cbihmdW5jdGlvbigpIHtcbiAgY29uc3QgX29yaWdGZXRjaCA9IHdpbmRvdy5mZXRjaDtcbiAgd2luZG93LmZldGNoID0gYXN5bmMgZnVuY3Rpb24oLi4uYXJncykge1xuICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBfb3JpZ0ZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIGxldCBzaG91bGRTaG93QmFubmVyID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3VXJsID0gdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnID8gYXJnc1swXSA6IGFyZ3NbMF0/LnVybDtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmF3VXJsLCB3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICAgIHNob3VsZFNob3dCYW5uZXIgPSB1cmwucGF0aG5hbWUgIT09ICcvYXBpL3Nlc3Npb25zL2NsYWltJyAmJiB1cmwucGF0aG5hbWUgIT09ICcvYXBpL3Nlc3Npb25zL3Rha2VvdmVyJztcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICBzaG91bGRTaG93QmFubmVyID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3Auc3RhdHVzID09PSA0MDkgJiYgc2hvdWxkU2hvd0Jhbm5lcikge1xuICAgICAgc2hvd1Nlc3Npb25Db25mbGljdEJhbm5lcigpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcDtcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgYXBwbGljYXRpb24gb24gRE9NIHJlYWR5LlxuICogU2V0cyB1cCBldmVudCBsaXN0ZW5lcnMsIHJlc3RvcmVzIHNlc3Npb24sIGFuZCBsb2FkcyBpbml0aWFsIHRhYi5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgdHJ5IHtcbiAgICAvLyBJbml0aWFsaXplIHN0YXRlXG4gICAgaWYgKHR5cGVvZiBpbml0aWFsaXplU3RhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGluaXRpYWxpemVTdGF0ZSgpO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byByZXN0b3JlIHByaW9yIHNlc3Npb25cbiAgICBpZiAodHlwZW9mIHJlc3RvcmVTZXNzaW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhd2FpdCByZXN0b3JlU2Vzc2lvbigpO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBldmVudCBsaXN0ZW5lcnNcbiAgICBzZXR1cEV2ZW50TGlzdGVuZXJzKCk7XG5cbiAgICAvLyBSZXN0b3JlIHRhYiBkYXRhIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgaWYgKHR5cGVvZiBsb2FkU3RhdGVGcm9tTG9jYWxTdG9yYWdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBsb2FkU3RhdGVGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgfVxuXG4gICAgLy8gTG9hZCBpbml0aWFsIHRhYiBjb250ZW50XG4gICAgY29uc3Qgc2F2ZWRUYWIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTdG9yYWdlS2V5cy5DVVJSRU5UX1RBQikgfHwgJ2pvYic7XG4gICAgc3dpdGNoVGFiKHNhdmVkVGFiKTtcblxuICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQXBwbGljYXRpb24gaW5pdGlhbGl6ZWQnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdJbml0aWFsaXphdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgYXBwZW5kTWVzc2FnZSgnc3lzdGVtJywgYFx1MjZBMFx1RkUwRiBGYWlsZWQgdG8gaW5pdGlhbGl6ZTogJHtlcnJvci5tZXNzYWdlfWApO1xuICB9XG59XG5cbi8qKlxuICogU2V0IHVwIGFsbCBnbG9iYWwgZXZlbnQgbGlzdGVuZXJzLlxuICovXG5mdW5jdGlvbiBzZXR1cEV2ZW50TGlzdGVuZXJzKCkge1xuICAvLyBUYWIgYnV0dG9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudGFiJykuZm9yRWFjaCh0YWIgPT4ge1xuICAgIHRhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBjb25zdCB0YWJOYW1lID0gZS50YXJnZXQuaWQucmVwbGFjZSgndGFiLScsICcnKTtcblxuICAgICAgLy8gR3VhcmQ6IGlmIHRoZSB1c2VyIGlzIGNsaWNraW5nIGludG8gYW4gZWFybGllciBzdGFnZSwgc2hvdyB0aGUgc2FtZVxuICAgICAgLy8gZG93bnN0cmVhbS1hd2FyZSBjb25maXJtYXRpb24gbW9kYWwgdXNlZCBieSB0aGUgc3RhZ2UgcHJvZ3Jlc3MgYmFyLlxuICAgICAgY29uc3QgdGFyZ2V0U3RhZ2UgPSBnZXRTdGFnZUZvclRhYih0YWJOYW1lKTtcbiAgICAgIGlmIChcbiAgICAgICAgdGFyZ2V0U3RhZ2UgJiZcbiAgICAgICAgdHlwZW9mIF9TVEVQX09SREVSICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB0eXBlb2YgX3Nob3dSZVJ1bkNvbmZpcm1Nb2RhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldElkeCAgPSBfU1RFUF9PUkRFUi5pbmRleE9mKHRhcmdldFN0YWdlKTtcbiAgICAgICAgY29uc3QgY3VycmVudElkeCA9IF9TVEVQX09SREVSLmluZGV4T2YoY3VycmVudFN0YWdlKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0U3RlcEVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHN0ZXAtJHt0YXJnZXRTdGFnZX1gKTtcbiAgICAgICAgaWYgKHRhcmdldElkeCA8IGN1cnJlbnRJZHggJiYgdGFyZ2V0U3RlcEVsICYmIHRhcmdldFN0ZXBFbC5jbGFzc0xpc3QuY29udGFpbnMoJ2NvbXBsZXRlZCcpKSB7XG4gICAgICAgICAgX3Nob3dSZVJ1bkNvbmZpcm1Nb2RhbCh0YXJnZXRTdGFnZSwgJ2JhY2stbmF2JywgKCkgPT4gc3dpdGNoVGFiKHRhYk5hbWUpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3dpdGNoVGFiKHRhYk5hbWUpO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIGFycm93IGtleSBuYXZpZ2F0aW9uIGZvciB0YWJzIChXQ0FHIDIuMSBBQSBUYWJzIHBhdHRlcm4pXG4gICAgdGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZSkgPT4ge1xuICAgICAgaWYgKFsnQXJyb3dMZWZ0JywgJ0Fycm93UmlnaHQnLCAnSG9tZScsICdFbmQnXS5pbmNsdWRlcyhlLmtleSkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCB0YWJzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudGFiOm5vdChbc3R5bGUqPVwiZGlzcGxheTogbm9uZVwiXSknKSk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbmRleCA9IHRhYnMuaW5kZXhPZihlLnRhcmdldCk7XG5cbiAgICAgICAgbGV0IG5leHRUYWI7XG4gICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93TGVmdCcgfHwgZS5rZXkgPT09ICdIb21lJykge1xuICAgICAgICAgIG5leHRUYWIgPSBlLmtleSA9PT0gJ0hvbWUnID8gdGFic1swXSA6IHRhYnNbKGN1cnJlbnRJbmRleCAtIDEgKyB0YWJzLmxlbmd0aCkgJSB0YWJzLmxlbmd0aF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dFRhYiA9IGUua2V5ID09PSAnRW5kJyA/IHRhYnNbdGFicy5sZW5ndGggLSAxXSA6IHRhYnNbKGN1cnJlbnRJbmRleCArIDEpICUgdGFicy5sZW5ndGhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5leHRUYWIpIHtcbiAgICAgICAgICBuZXh0VGFiLmZvY3VzKCk7XG4gICAgICAgICAgbmV4dFRhYi5jbGljaygpOyAvLyBBY3RpdmF0ZSB0aGUgdGFiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gTWVzc2FnZSBpbnB1dCAoRW50ZXIga2V5IHRvIHNlbmQpXG4gIGNvbnN0IG1lc3NhZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZXNzYWdlLWlucHV0Jyk7XG4gIGlmIChtZXNzYWdlSW5wdXQpIHtcbiAgICBtZXNzYWdlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmICFlLnNoaWZ0S2V5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBzZW5kTWVzc2FnZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHNlbmRNZXNzYWdlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIENoYXQgdG9nZ2xlIGJ1dHRvblxuICBjb25zdCB0b2dnbGVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudG9nZ2xlLWNoYXQnKTtcbiAgaWYgKHRvZ2dsZUJ0bikge1xuICAgIHRvZ2dsZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRvZ2dsZUNoYXQpO1xuICB9XG5cbiAgLy8gTW9kYWwgY2xvc2Ugb24gRVNDIGtleVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGUpID0+IHtcbiAgICBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICBjbG9zZUFsbE1vZGFscygpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2xvc2UgbW9kYWxzIG9uIGJhY2tncm91bmQgY2xpY2tcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3JvbGU9XCJkaWFsb2dcIl0nKS5mb3JFYWNoKG1vZGFsID0+IHtcbiAgICBtb2RhbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBpZiAoZS50YXJnZXQgPT09IG1vZGFsKSB7XG4gICAgICAgIGNsb3NlTW9kYWwobW9kYWwuaWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHN0YWdlIHRoYXQgb3ducyBhIGdpdmVuIHRhYiwgb3IgbnVsbCBpZiB1bm1hcHBlZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWJcbiAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH1cbiAqL1xuZnVuY3Rpb24gZ2V0U3RhZ2VGb3JUYWIodGFiKSB7XG4gIGZvciAoY29uc3QgW3N0YWdlLCB0YWJzXSBvZiBPYmplY3QuZW50cmllcyhTVEFHRV9UQUJTKSkge1xuICAgIGlmICh0YWJzLmluY2x1ZGVzKHRhYikpIHJldHVybiBzdGFnZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBTaG93L2hpZGUgdGhlIHNjcm9sbCBhcnJvdyBidXR0b25zIGJhc2VkIG9uIHdoZXRoZXIgdGhlIHRhYiBiYXIgaXMgc2Nyb2xsYWJsZS5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlVGFiU2Nyb2xsQnV0dG9ucygpIHtcbiAgY29uc3QgdGFiQmFyICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YWItYmFyJyk7XG4gIGNvbnN0IGxlZnRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGFiLXNjcm9sbC1sZWZ0Jyk7XG4gIGNvbnN0IHJpZ2h0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RhYi1zY3JvbGwtcmlnaHQnKTtcbiAgaWYgKCF0YWJCYXIgfHwgIWxlZnRCdG4gfHwgIXJpZ2h0QnRuKSByZXR1cm47XG4gIGxlZnRCdG4uc3R5bGUuZGlzcGxheSAgPSB0YWJCYXIuc2Nyb2xsTGVmdCA+IDAgPyAnJyA6ICdub25lJztcbiAgcmlnaHRCdG4uc3R5bGUuZGlzcGxheSA9IHRhYkJhci5zY3JvbGxMZWZ0IDwgdGFiQmFyLnNjcm9sbFdpZHRoIC0gdGFiQmFyLmNsaWVudFdpZHRoIC0gMSA/ICcnIDogJ25vbmUnO1xufVxuXG4vKipcbiAqIFNob3cgb25seSB0aGUgdGFicyB0aGF0IGJlbG9uZyB0byB0aGUgZ2l2ZW4gc3RhZ2UgaW4gdGhlIHNlY29uZCBuYXYgYmFyLlxuICogQHBhcmFtIHtzdHJpbmd9IHN0YWdlIC0gS2V5IGZyb20gU1RBR0VfVEFCU1xuICovXG5mdW5jdGlvbiB1cGRhdGVUYWJCYXJGb3JTdGFnZShzdGFnZSkge1xuICBjb25zdCBzdGFnZVRhYnMgPSBTVEFHRV9UQUJTW3N0YWdlXSB8fCBbXTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRhYicpLmZvckVhY2godGFiID0+IHtcbiAgICB0YWIuc3R5bGUuZGlzcGxheSA9IHN0YWdlVGFicy5pbmNsdWRlcyh0YWIuZGF0YXNldC50YWIpID8gJycgOiAnbm9uZSc7XG4gIH0pO1xuICAvLyBSZXNldCBzY3JvbGwgcG9zaXRpb24gdG8gc2hvdyBhY3RpdmUgdGFiLCB0aGVuIHJlZnJlc2ggYXJyb3cgdmlzaWJpbGl0eVxuICBjb25zdCB0YWJCYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGFiLWJhcicpO1xuICBpZiAodGFiQmFyKSB0YWJCYXIuc2Nyb2xsTGVmdCA9IDA7XG4gIHVwZGF0ZVRhYlNjcm9sbEJ1dHRvbnMoKTtcbn1cblxuLyoqXG4gKiBBY3RpdmF0ZSBhIHdvcmtmbG93IHN0YWdlOiB1cGRhdGUgc2Vjb25kLWJhciB2aXNpYmlsaXR5IGFuZCBuYXZpZ2F0ZSB0byB0aGVcbiAqIGZpcnN0IChvciBhbHJlYWR5LWFjdGl2ZSkgdGFiIHdpdGhpbiB0aGF0IHN0YWdlLlxuICogQHBhcmFtIHtzdHJpbmd9IHN0YWdlIC0gS2V5IGZyb20gU1RBR0VfVEFCU1xuICovXG5mdW5jdGlvbiBzd2l0Y2hTdGFnZShzdGFnZSkge1xuICBjdXJyZW50U3RhZ2UgPSBzdGFnZTtcbiAgdXBkYXRlVGFiQmFyRm9yU3RhZ2Uoc3RhZ2UpO1xuICBjb25zdCBzdGFnZVRhYnMgPSBTVEFHRV9UQUJTW3N0YWdlXSB8fCBbXTtcbiAgaWYgKHN0YWdlVGFicy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgLy8gUHJlZmVyIHdoaWNoZXZlciB0YWIgd2l0aGluIHRoaXMgc3RhZ2UgaXMgYWxyZWFkeSBhY3RpdmU7IGVsc2UgdXNlIGZpcnN0XG4gIGNvbnN0IGFjdGl2ZVRhYiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50YWIuYWN0aXZlJyk7XG4gIGNvbnN0IGFjdGl2ZVRhYk5hbWUgPSBhY3RpdmVUYWIgPyBhY3RpdmVUYWIuZGF0YXNldC50YWIgOiBudWxsO1xuICBjb25zdCB0YXJnZXQgPSAoYWN0aXZlVGFiTmFtZSAmJiBzdGFnZVRhYnMuaW5jbHVkZXMoYWN0aXZlVGFiTmFtZSkpXG4gICAgPyBhY3RpdmVUYWJOYW1lXG4gICAgOiBzdGFnZVRhYnNbMF07XG4gIHN3aXRjaFRhYih0YXJnZXQpO1xufVxuXG4vKipcbiAqIExvYWQgY29udGVudCBmb3IgYSBzcGVjaWZpYyB0YWIuXG4gKiBSb3V0ZXMgdG8gYXBwcm9wcmlhdGUgcmVuZGVyaW5nIGZ1bmN0aW9uIGJhc2VkIG9uIHRhYi5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWIgLSBUYWIgbmFtZVxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkVGFiQ29udGVudCh0YWIpIHtcbiAgY29uc3QgY29udGVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb2N1bWVudC1jb250ZW50Jyk7XG4gIGlmICghY29udGVudCkgcmV0dXJuO1xuXG4gIGNvbnRlbnQuaW5uZXJIVE1MID0gJyc7IC8vIENsZWFyIHByZXZpb3VzIGNvbnRlbnRcblxuICB0cnkge1xuICAgIHN3aXRjaCAodGFiKSB7XG4gICAgICBjYXNlICdqb2InOlxuICAgICAgICBpZiAodHlwZW9mIHBvcHVsYXRlSm9iVGFiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgYXdhaXQgcG9wdWxhdGVKb2JUYWIoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYW5hbHlzaXMnOlxuICAgICAgICBpZiAodHlwZW9mIHBvcHVsYXRlQW5hbHlzaXNUYWIgPT09ICdmdW5jdGlvbicgJiYgdGFiRGF0YS5hbmFseXNpcykge1xuICAgICAgICAgIHBvcHVsYXRlQW5hbHlzaXNUYWIodGFiRGF0YS5hbmFseXNpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSAnPHAgc3R5bGU9XCJwYWRkaW5nOiAyMHB4OyBjb2xvcjogIzY2NjtcIj5ObyBhbmFseXNpcyBkYXRhIHlldC4gU3VibWl0IGEgam9iIGRlc2NyaXB0aW9uIHRvIGJlZ2luLjwvcD4nO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjdXN0b21pemF0aW9ucyc6XG4gICAgICAgIGlmICh0eXBlb2YgcG9wdWxhdGVDdXN0b21pemF0aW9uc1RhYiA9PT0gJ2Z1bmN0aW9uJyAmJiB0YWJEYXRhLmN1c3RvbWl6YXRpb25zKSB7XG4gICAgICAgICAgcG9wdWxhdGVDdXN0b21pemF0aW9uc1RhYih0YWJEYXRhLmN1c3RvbWl6YXRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250ZW50LmlubmVySFRNTCA9ICc8cCBzdHlsZT1cInBhZGRpbmc6IDIwcHg7IGNvbG9yOiAjNjY2O1wiPlJ1biBhbmFseXNpcyBmaXJzdCB0byBzZWUgY3VzdG9taXphdGlvbiByZWNvbW1lbmRhdGlvbnMuPC9wPic7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2dlbmVyYXRlJzpcbiAgICAgICAgaWYgKHR5cGVvZiBwb3B1bGF0ZUNWVGFiID09PSAnZnVuY3Rpb24nICYmIHRhYkRhdGEuY3YpIHtcbiAgICAgICAgICBwb3B1bGF0ZUNWVGFiKHRhYkRhdGEuY3YpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gJzxwIHN0eWxlPVwicGFkZGluZzogMjBweDsgY29sb3I6ICM2NjY7XCI+R2VuZXJhdGUgYSBDViB0byBzZWUgcHJldmlldy48L3A+JztcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnZG93bmxvYWQnOlxuICAgICAgICBpZiAodHlwZW9mIHBvcHVsYXRlRG93bmxvYWRUYWIgPT09ICdmdW5jdGlvbicgJiYgdGFiRGF0YS5jdikge1xuICAgICAgICAgIGF3YWl0IHBvcHVsYXRlRG93bmxvYWRUYWIodGFiRGF0YS5jdik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29udGVudC5pbm5lckhUTUwgPSAnPHAgc3R5bGU9XCJwYWRkaW5nOiAyMHB4OyBjb2xvcjogIzY2NjtcIj5HZW5lcmF0ZSBhIENWIGZpcnN0IHRvIGRvd25sb2FkLjwvcD4nO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb250ZW50LmlubmVySFRNTCA9ICc8cCBzdHlsZT1cInBhZGRpbmc6IDIwcHg7IGNvbG9yOiAjOTk5O1wiPlVua25vd24gdGFiLjwvcD4nO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBsb2FkaW5nIHRhYiAke3RhYn06YCwgZXJyb3IpO1xuICAgIGNvbnRlbnQuaW5uZXJIVE1MID0gYDxwIHN0eWxlPVwicGFkZGluZzogMjBweDsgY29sb3I6ICNjNDFlM2E7XCI+RXJyb3IgbG9hZGluZyBjb250ZW50OiAke2Vycm9yLm1lc3NhZ2V9PC9wPmA7XG4gIH1cbn1cblxuLyoqXG4gKiBUb2dnbGUgY29sbGFwc2libGUgY2hhdCBwYW5lbCAoaW50ZXJhY3Rpb24gYXJlYSkuXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZUNoYXQoKSB7XG4gIGNvbnN0IGludGVyYWN0aW9uQXJlYSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbnRlcmFjdGlvbi1hcmVhJyk7XG4gIGNvbnN0IHZpZXdlckFyZWEgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudmlld2VyLWFyZWEnKTtcblxuICBpZiAoaW50ZXJhY3Rpb25BcmVhKSB7XG4gICAgY29uc3QgaXNDb2xsYXBzZWQgPSBpbnRlcmFjdGlvbkFyZWEuY2xhc3NMaXN0LnRvZ2dsZSgnY29sbGFwc2VkJyk7XG4gICAgaWYgKHZpZXdlckFyZWEpIHtcbiAgICAgIHZpZXdlckFyZWEuc3R5bGUuZmxleCA9IGlzQ29sbGFwc2VkID8gJzEgMSAxMDAlJyA6ICcwIDEgNjAlJztcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLkNIQVRfQ09MTEFQU0VELCBpc0NvbGxhcHNlZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3Qgc2F2ZSBjaGF0IHN0YXRlJyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogT3BlbiBhIG1vZGFsIGJ5IElELlxuICogQHBhcmFtIHtzdHJpbmd9IG1vZGFsSWQgLSBJRCBvZiBtb2RhbCBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG9wZW5Nb2RhbChtb2RhbElkKSB7XG4gIGNvbnN0IG1vZGFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kYWxJZCk7XG4gIGlmIChtb2RhbCkge1xuICAgIC8vIFNhdmUgZm9jdXMgYmVmb3JlIG9wZW5pbmcgbW9kYWxcbiAgICBfZm9jdXNlZEVsZW1lbnRCZWZvcmVNb2RhbCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG5cbiAgICBtb2RhbC5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgbW9kYWwuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgIC8vIExvY2sgYm9keSBzY3JvbGxcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBmb2N1cyBhbmQgdHJhcCBmb2N1cyB3aXRoaW4gbW9kYWxcbiAgICBzZXRJbml0aWFsRm9jdXMobW9kYWxJZCk7XG4gICAgdHJhcEZvY3VzKG1vZGFsSWQpO1xuICB9XG59XG5cbi8qKlxuICogQ2xvc2UgYSBtb2RhbCBieSBJRC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBtb2RhbElkIC0gSUQgb2YgbW9kYWwgZWxlbWVudFxuICovXG5mdW5jdGlvbiBjbG9zZU1vZGFsKG1vZGFsSWQpIHtcbiAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RhbElkKTtcbiAgaWYgKG1vZGFsKSB7XG4gICAgbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuICAgIG1vZGFsLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIC8vIFJlc3RvcmUgYm9keSBzY3JvbGxcbiAgICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tyb2xlPVwiZGlhbG9nXCJdLnZpc2libGUnKSkge1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgIH1cbiAgICAvLyBSZXN0b3JlIGZvY3VzXG4gICAgcmVzdG9yZUZvY3VzKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDbG9zZSBhbGwgb3BlbiBtb2RhbHMuXG4gKi9cbmZ1bmN0aW9uIGNsb3NlQWxsTW9kYWxzKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbcm9sZT1cImRpYWxvZ1wiXScpLmZvckVhY2gobW9kYWwgPT4ge1xuICAgIG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcbiAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICBpZiAobW9kYWwuc3R5bGUuZGlzcGxheSAmJiBtb2RhbC5zdHlsZS5kaXNwbGF5ICE9PSAnbm9uZScpIHtcbiAgICAgIG1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuICB9KTtcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAvLyBSZXN0b3JlIGZvY3VzXG4gIHJlc3RvcmVGb2N1cygpO1xufVxuXG4vKipcbiAqIFNob3cgc2Vzc2lvbiBjb25mbGljdCB3YXJuaW5nIGJhbm5lciAobXVsdGlwbGUgdGFicyBhY3RpdmUpLlxuICovXG5mdW5jdGlvbiBzaG93U2Vzc2lvbkNvbmZsaWN0QmFubmVyKCkge1xuICBjb25zdCBiYW5uZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2Vzc2lvbi1jb25mbGljdC1iYW5uZXInKTtcbiAgaWYgKGJhbm5lcikge1xuICAgIGJhbm5lci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxufVxuXG4vKipcbiAqIERpc3BsYXkgYW4gYWxlcnQgbW9kYWwgd2l0aCB0aXRsZSBhbmQgbWVzc2FnZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0aXRsZSAtIE1vZGFsIHRpdGxlXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIE1vZGFsIG1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gc2hvd0FsZXJ0TW9kYWwodGl0bGUsIG1lc3NhZ2UpIHtcbiAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWxlcnQtbW9kYWwnKTtcbiAgaWYgKCFtb2RhbCkge1xuICAgIC8vIENyZWF0ZSBhbGVydCBtb2RhbCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgY29uc3QgbmV3TW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBuZXdNb2RhbC5pZCA9ICdhbGVydC1tb2RhbCc7XG4gICAgbmV3TW9kYWwuc2V0QXR0cmlidXRlKCdyb2xlJywgJ2RpYWxvZycpO1xuICAgIG5ld01vZGFsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJtb2RhbC1vdmVybGF5IGFsZXJ0LW1vZGFsLW92ZXJsYXlcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJtb2RhbC1jb250ZW50IGFsZXJ0LW1vZGFsXCI+XG4gICAgICAgICAgPGgyIGlkPVwiYWxlcnQtdGl0bGVcIj48L2gyPlxuICAgICAgICAgIDxwIGlkPVwiYWxlcnQtbWVzc2FnZVwiPjwvcD5cbiAgICAgICAgICA8YnV0dG9uIG9uY2xpY2s9XCJjbG9zZUFsZXJ0TW9kYWwoKVwiIGNsYXNzPVwibW9kYWwtYnRuXCI+T0s8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobmV3TW9kYWwpO1xuICB9XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FsZXJ0LXRpdGxlJykudGV4dENvbnRlbnQgPSB0aXRsZTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FsZXJ0LW1lc3NhZ2UnKS5pbm5lckhUTUwgPSBtZXNzYWdlO1xuICBvcGVuTW9kYWwoJ2FsZXJ0LW1vZGFsJyk7XG59XG5cbi8qKlxuICogQ2xvc2UgdGhlIGFsZXJ0IG1vZGFsLlxuICovXG5mdW5jdGlvbiBjbG9zZUFsZXJ0TW9kYWwoKSB7XG4gIGNsb3NlTW9kYWwoJ2FsZXJ0LW1vZGFsJyk7XG59XG5cbi8qKlxuICogUm91dGUgbWVzc2FnZSByZXNwb25zZXMgdG8gYXBwcm9wcmlhdGUgaGFuZGxlcnMgYmFzZWQgb24gd29ya2Zsb3cgcGhhc2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGhhc2UgLSBDdXJyZW50IHdvcmtmbG93IHBoYXNlXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZGlzcGxheU1lc3NhZ2UocGhhc2UsIHJlc3BvbnNlKSB7XG4gIHRyeSB7XG4gICAgc3dpdGNoIChwaGFzZSkge1xuICAgICAgY2FzZSAnam9iX2lucHV0JzpcbiAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgYXBwZW5kTWVzc2FnZSgnc3lzdGVtJywgYEVycm9yOiAke3Jlc3BvbnNlLmVycm9yfWApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLmpvYl9hbmFseXNpcykge1xuICAgICAgICAgIC8vIEFuYWx5c2lzIHJlYWR5XG4gICAgICAgICAgdGFiRGF0YS5hbmFseXNpcyA9IHJlc3BvbnNlLmpvYl9hbmFseXNpcztcbiAgICAgICAgICBhcHBlbmRNZXNzYWdlKCdhc3Npc3RhbnQnLCBgQW5hbHlzaXMgY29tcGxldGUhIEknbGwgbm93IHNob3cgeW91IHRoZSBqb2IgYW5hbHlzaXMgYW5kIHBvc3QtYW5hbHlzaXMgcXVlc3Rpb25zLmApO1xuICAgICAgICAgIHN3aXRjaFRhYignYW5hbHlzaXMnKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBvcHVsYXRlQW5hbHlzaXNUYWIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHBvcHVsYXRlQW5hbHlzaXNUYWIocmVzcG9uc2Uuam9iX2FuYWx5c2lzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBhc2tQb3N0QW5hbHlzaXNRdWVzdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IGFza1Bvc3RBbmFseXNpc1F1ZXN0aW9ucyhyZXNwb25zZS5qb2JfYW5hbHlzaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY3VzdG9taXphdGlvbl9zZWxlY3Rpb24nOlxuICAgICAgICBpZiAocmVzcG9uc2UuY3VzdG9taXphdGlvbnMpIHtcbiAgICAgICAgICB0YWJEYXRhLmN1c3RvbWl6YXRpb25zID0gcmVzcG9uc2UuY3VzdG9taXphdGlvbnM7XG4gICAgICAgICAgd2luZG93LnBlbmRpbmdSZWNvbW1lbmRhdGlvbnMgPSByZXNwb25zZS5jdXN0b21pemF0aW9ucztcbiAgICAgICAgICBzd2l0Y2hUYWIoJ2N1c3RvbWl6YXRpb25zJyk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwb3B1bGF0ZUN1c3RvbWl6YXRpb25zVGFiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBwb3B1bGF0ZUN1c3RvbWl6YXRpb25zVGFiKHJlc3BvbnNlLmN1c3RvbWl6YXRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3Jld3JpdGVfcmV2aWV3JzpcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJld3JpdGVzKSB7XG4gICAgICAgICAgc3dpdGNoVGFiKCdyZXdyaXRlcycpO1xuICAgICAgICAgIGlmICh0eXBlb2YgZmV0Y2hBbmRSZXZpZXdSZXdyaXRlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXdhaXQgZmV0Y2hBbmRSZXZpZXdSZXdyaXRlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnZ2VuZXJhdGlvbic6XG4gICAgICAgIGlmIChyZXNwb25zZS5nZW5lcmF0ZWRfZmlsZXMpIHtcbiAgICAgICAgICB0YWJEYXRhLmN2ID0gcmVzcG9uc2UuZ2VuZXJhdGVkX2ZpbGVzO1xuICAgICAgICAgIHN3aXRjaFRhYignZG93bmxvYWQnKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBvcHVsYXRlRG93bmxvYWRUYWIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IHBvcHVsYXRlRG93bmxvYWRUYWIocmVzcG9uc2UuZ2VuZXJhdGVkX2ZpbGVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIFJlZ3VsYXIgY29udmVyc2F0aW9uIG1lc3NhZ2VcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2UgfHwgcmVzcG9uc2UucmVzcG9uc2UpIHtcbiAgICAgICAgICBhcHBlbmRNZXNzYWdlKCdhc3Npc3RhbnQnLCByZXNwb25zZS5tZXNzYWdlIHx8IHJlc3BvbnNlLnJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkaXNwbGF5aW5nIG1lc3NhZ2U6JywgZXJyb3IpO1xuICAgIGFwcGVuZE1lc3NhZ2UoJ3N5c3RlbScsIGBFcnJvciBwcm9jZXNzaW5nIHJlc3BvbnNlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgdmlzdWFsIHdvcmtmbG93IGluZGljYXRvciAocHJvZ3Jlc3MgYmFyLCBicmVhZGNydW1iKS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0dXMgLSBTdGF0dXMgb2JqZWN0IGZyb20gc2VydmVyXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVBoYXNlSW5kaWNhdG9yKHN0YXR1cykge1xuICBpZiAoIXN0YXR1cy5waGFzZSkgcmV0dXJuO1xuXG4gIGNvbnN0IHNlc3Npb25OYW1lRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGVhZGVyLXNlc3Npb24tbmFtZScpO1xuICBpZiAoc2Vzc2lvbk5hbWVFbCkge1xuICAgIHNlc3Npb25OYW1lRWwudGV4dENvbnRlbnQgPSBzdGF0dXMucG9zaXRpb25fbmFtZSB8fCAnJztcbiAgfVxuXG4gIGNvbnN0IHBoYXNlcyA9IFsnam9iX2lucHV0JywgJ2FuYWx5c2lzJywgJ2N1c3RvbWl6YXRpb24nLCAncmV3cml0ZV9yZXZpZXcnLCAnZ2VuZXJhdGlvbicsICdyZWZpbmVtZW50J107XG4gIGNvbnN0IHBoYXNlSW5kZXggPSBwaGFzZXMuaW5kZXhPZihzdGF0dXMucGhhc2UpO1xuXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zdGVwJykuZm9yRWFjaCgoc3RlcCwgaWR4KSA9PiB7XG4gICAgc3RlcC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnLCAnY29tcGxldGVkJywgJ3VwY29taW5nJyk7XG5cbiAgICBpZiAoaWR4IDwgcGhhc2VJbmRleCkge1xuICAgICAgc3RlcC5jbGFzc0xpc3QuYWRkKCdjb21wbGV0ZWQnKTtcbiAgICB9IGVsc2UgaWYgKGlkeCA9PT0gcGhhc2VJbmRleCkge1xuICAgICAgc3RlcC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RlcC5jbGFzc0xpc3QuYWRkKCd1cGNvbWluZycpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogRW5hYmxlL2Rpc2FibGUgY29udHJvbHMgYmFzZWQgb24gd29ya2Zsb3cgc3RhdGUuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZWQgLSBUcnVlIHRvIGVuYWJsZSBjb250cm9sc1xuICovXG5mdW5jdGlvbiBzZXRDb250cm9sc0VuYWJsZWQoZW5hYmxlZCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdidXR0b24sIGlucHV0LCB0ZXh0YXJlYScpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmRpc2FibGVkID0gIWVuYWJsZWQ7XG4gIH0pO1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgTW9kZWwgc2VsZWN0b3IgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmxldCBfbW9kZWxEYXRhID0gbnVsbDsgLy8gY2FjaGVkIGZyb20gbGFzdCBsb2FkTW9kZWxTZWxlY3RvcigpIGNhbGxcbmxldCBfbW9kZWxEYXRhVGFibGUgPSBudWxsO1xubGV0IF9zZWxlY3RlZE1vZGVsUHJvdmlkZXJzID0gbmV3IFNldCgpO1xubGV0IF9tb2RlbFNlbGVjdG9yTG9hZGluZyA9IGZhbHNlOyAgIC8vIGd1YXJkOiBsb2FkTW9kZWxTZWxlY3RvcigpIGluIGZsaWdodFxubGV0IF9jYXRhbG9nUmVmcmVzaGluZyA9IGZhbHNlOyAgICAgIC8vIGd1YXJkOiBfcmVmcmVzaE1vZGVsQ2F0YWxvZ0ZvclNlbGVjdGlvbigpIGluIGZsaWdodFxuXG5hc3luYyBmdW5jdGlvbiBsb2FkTW9kZWxTZWxlY3RvcigpIHtcbiAgaWYgKF9tb2RlbFNlbGVjdG9yTG9hZGluZykgcmV0dXJuO1xuICBfbW9kZWxTZWxlY3RvckxvYWRpbmcgPSB0cnVlO1xuICB0cnkge1xuICAgIF9tb2RlbERhdGEgPSBhd2FpdCBhcGlDYWxsKCdHRVQnLCAnL2FwaS9tb2RlbCcpO1xuICAgIC8vIElmIGJhY2tlbmQgZGlkbid0IHJldHVybiBhIHBlcnNpc3RlbnQgc2VsZWN0aW9uLCBwcmVmZXIgYSBsb2NhbGx5LXNhdmVkIGNob2ljZVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzYXZlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBKTtcbiAgICAgIGlmIChzYXZlZCkge1xuICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHNhdmVkKTtcbiAgICAgICAgaWYgKHBhcnNlZCAmJiAhKF9tb2RlbERhdGEgJiYgX21vZGVsRGF0YS5wcm92aWRlcikgJiYgcGFyc2VkLmN1cnJlbnRNb2RlbFByb3ZpZGVyKSB7XG4gICAgICAgICAgX21vZGVsRGF0YSA9IF9tb2RlbERhdGEgfHwge307XG4gICAgICAgICAgX21vZGVsRGF0YS5wcm92aWRlciA9IHBhcnNlZC5jdXJyZW50TW9kZWxQcm92aWRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyc2VkICYmICEoX21vZGVsRGF0YSAmJiBfbW9kZWxEYXRhLm1vZGVsKSAmJiBwYXJzZWQuY3VycmVudE1vZGVsTmFtZSkge1xuICAgICAgICAgIF9tb2RlbERhdGEgPSBfbW9kZWxEYXRhIHx8IHt9O1xuICAgICAgICAgIF9tb2RlbERhdGEubW9kZWwgPSBwYXJzZWQuY3VycmVudE1vZGVsTmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUud2FybignQ291bGQgbm90IHJlYWQgc2F2ZWQgbW9kZWwgZnJvbSBsb2NhbFN0b3JhZ2U6JywgZSk7XG4gICAgfVxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLWN1cnJlbnQtbGFiZWwnKTtcbiAgICBpZiAobGFiZWwpIHtcbiAgICAgIGNvbnN0IHByb3YgID0gX21vZGVsRGF0YS5wcm92aWRlcjtcbiAgICAgIGNvbnN0IG1vZGVsID0gX21vZGVsRGF0YS5tb2RlbCB8fCAnXHUyMDE0JztcbiAgICAgIGxhYmVsLnRleHRDb250ZW50ID0gcHJvdiA/IGAke3Byb3Z9IFx1MDBCNyAke21vZGVsfWAgOiBtb2RlbDtcbiAgICB9XG4gICAgaWYgKF9tb2RlbERhdGEgJiYgX21vZGVsRGF0YS5wcm92aWRlcikge1xuICAgICAgX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMgPSBuZXcgU2V0KFtfbW9kZWxEYXRhLnByb3ZpZGVyXSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS53YXJuKCdDb3VsZCBub3QgbG9hZCBtb2RlbCBsaXN0OicsIGUpO1xuICB9IGZpbmFsbHkge1xuICAgIF9tb2RlbFNlbGVjdG9yTG9hZGluZyA9IGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9wcm92aWRlclN0YWdlTGFiZWwocHJvdmlkZXIsIGNhcGFibGVTZXQpIHtcbiAgY29uc3QgaXNDYXBhYmxlID0gY2FwYWJsZVNldC5oYXMocHJvdmlkZXIpO1xuICByZXR1cm4gaXNDYXBhYmxlID8gJ2xpc3RfbW9kZWxzJyA6ICdmYWxsYmFjayc7XG59XG5cbmZ1bmN0aW9uIF9yZW5kZXJQcm92aWRlclNlbGVjdG9yKCkge1xuICBjb25zdCBsaXN0RWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZWwtcHJvdmlkZXItbGlzdCcpO1xuICBpZiAoIWxpc3RFbCB8fCAhX21vZGVsRGF0YSkgcmV0dXJuO1xuXG4gIGNvbnN0IHByb3ZpZGVycyA9IEFycmF5LmlzQXJyYXkoX21vZGVsRGF0YS5wcm92aWRlcnMpXG4gICAgPyBfbW9kZWxEYXRhLnByb3ZpZGVyc1xuICAgIDogQXJyYXkuZnJvbShuZXcgU2V0KChfbW9kZWxEYXRhLmFsbF9tb2RlbHMgfHwgW10pLm1hcChyID0+IHIucHJvdmlkZXIpLmZpbHRlcihCb29sZWFuKSkpLnNvcnQoKTtcbiAgY29uc3QgY2FwYWJsZVNldCA9IG5ldyBTZXQoX21vZGVsRGF0YS5saXN0X21vZGVsc19jYXBhYmxlIHx8IFtdKTtcblxuICBpZiAoX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMuc2l6ZSA9PT0gMCAmJiBfbW9kZWxEYXRhLnByb3ZpZGVyKSB7XG4gICAgX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMuYWRkKF9tb2RlbERhdGEucHJvdmlkZXIpO1xuICB9XG5cbiAgbGlzdEVsLmlubmVySFRNTCA9ICcnO1xuICBwcm92aWRlcnMuZm9yRWFjaChwcm92aWRlciA9PiB7XG4gICAgY29uc3QgY2hlY2tlZCA9IF9zZWxlY3RlZE1vZGVsUHJvdmlkZXJzLmhhcyhwcm92aWRlcik7XG4gICAgY29uc3Qgc291cmNlTGFiZWwgPSBfcHJvdmlkZXJTdGFnZUxhYmVsKHByb3ZpZGVyLCBjYXBhYmxlU2V0KTtcblxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgICBsYWJlbC5zdHlsZS5jc3NUZXh0ID0gJ2Rpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBnYXA6NnB4OyBwYWRkaW5nOjRweCA4cHg7IGJvcmRlcjoxcHggc29saWQgI2NiZDVlMTsgYm9yZGVyLXJhZGl1czo5OTlweDsgZm9udC1zaXplOjAuODJlbTsgYmFja2dyb3VuZDojZmZmOyBjdXJzb3I6cG9pbnRlcjsnO1xuICAgIGxhYmVsLmlubmVySFRNTCA9XG4gICAgICBgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIHZhbHVlPVwiJHtlc2NhcGVIdG1sKHByb3ZpZGVyKX1cIiAke2NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gc3R5bGU9XCJtYXJnaW46MDtcIiAvPmAgK1xuICAgICAgYDxzcGFuPiR7ZXNjYXBlSHRtbChwcm92aWRlcil9PC9zcGFuPmAgK1xuICAgICAgYDxzcGFuIHN0eWxlPVwiY29sb3I6IzY0NzQ4YjsgZm9udC1zaXplOjAuOGVtO1wiPigke2VzY2FwZUh0bWwoc291cmNlTGFiZWwpfSk8L3NwYW4+YDtcblxuICAgIGNvbnN0IGNoZWNrYm94ID0gbGFiZWwucXVlcnlTZWxlY3RvcignaW5wdXQnKTtcbiAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC50YXJnZXQuY2hlY2tlZCkge1xuICAgICAgICBfc2VsZWN0ZWRNb2RlbFByb3ZpZGVycy5hZGQocHJvdmlkZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMuZGVsZXRlKHByb3ZpZGVyKTtcbiAgICAgIH1cbiAgICAgIGlmIChfc2VsZWN0ZWRNb2RlbFByb3ZpZGVycy5zaXplID09PSAwICYmIF9tb2RlbERhdGEucHJvdmlkZXIpIHtcbiAgICAgICAgX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMuYWRkKF9tb2RlbERhdGEucHJvdmlkZXIpO1xuICAgICAgICBldmVudC50YXJnZXQuY2hlY2tlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBhd2FpdCBfcmVmcmVzaE1vZGVsQ2F0YWxvZ0ZvclNlbGVjdGlvbigpO1xuICAgIH0pO1xuXG4gICAgbGlzdEVsLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9yZWZyZXNoTW9kZWxDYXRhbG9nRm9yU2VsZWN0aW9uKCkge1xuICBpZiAoX2NhdGFsb2dSZWZyZXNoaW5nIHx8ICFfbW9kZWxEYXRhKSByZXR1cm47XG4gIF9jYXRhbG9nUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBzZWxlY3RlZCA9IEFycmF5LmZyb20oX3NlbGVjdGVkTW9kZWxQcm92aWRlcnMpO1xuICAgIGlmICghc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICBfc2VsZWN0ZWRNb2RlbFByb3ZpZGVycyA9IG5ldyBTZXQoW19tb2RlbERhdGEucHJvdmlkZXJdKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm92aWRlcnNQYXJhbSA9IGVuY29kZVVSSUNvbXBvbmVudChBcnJheS5mcm9tKF9zZWxlY3RlZE1vZGVsUHJvdmlkZXJzKS5qb2luKCcsJykpO1xuICAgIGNvbnN0IGNhdGFsb2cgPSBhd2FpdCBhcGlDYWxsKCdHRVQnLCBgL2FwaS9tb2RlbC1jYXRhbG9nP3Byb3ZpZGVycz0ke3Byb3ZpZGVyc1BhcmFtfWApO1xuICAgIF9tb2RlbERhdGEuYWxsX21vZGVscyA9IGNhdGFsb2cuYWxsX21vZGVscyB8fCBbXTtcbiAgICBfbW9kZWxEYXRhLnByaWNpbmdfdXBkYXRlZF9hdCA9IGNhdGFsb2cucHJpY2luZ191cGRhdGVkX2F0IHx8IF9tb2RlbERhdGEucHJpY2luZ191cGRhdGVkX2F0O1xuICAgIF9tb2RlbERhdGEucHJpY2luZ19zb3VyY2UgPSBjYXRhbG9nLnByaWNpbmdfc291cmNlIHx8IF9tb2RlbERhdGEucHJpY2luZ19zb3VyY2U7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY2F0YWxvZy5wcm92aWRlcnMpICYmIGNhdGFsb2cucHJvdmlkZXJzLmxlbmd0aCkge1xuICAgICAgX21vZGVsRGF0YS5wcm92aWRlcnMgPSBjYXRhbG9nLnByb3ZpZGVycztcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY2F0YWxvZy5saXN0X21vZGVsc19jYXBhYmxlKSkge1xuICAgICAgX21vZGVsRGF0YS5saXN0X21vZGVsc19jYXBhYmxlID0gY2F0YWxvZy5saXN0X21vZGVsc19jYXBhYmxlO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCByZWZyZXNoIG1vZGVsIGNhdGFsb2cgZm9yIHNlbGVjdGVkIHByb3ZpZGVyczonLCBlcnJvcik7XG4gIH0gZmluYWxseSB7XG4gICAgX2NhdGFsb2dSZWZyZXNoaW5nID0gZmFsc2U7XG4gIH1cblxuICBfYnVpbGRNb2RlbFRhYmxlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG9wZW5Nb2RlbE1vZGFsKCkge1xuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLW1vZGFsLW92ZXJsYXknKTtcbiAgaWYgKCFvdmVybGF5KSByZXR1cm47XG5cbiAgaWYgKCFfbW9kZWxEYXRhKSB7XG4gICAgYXdhaXQgbG9hZE1vZGVsU2VsZWN0b3IoKTtcbiAgfVxuICBfcmVuZGVyUHJvdmlkZXJTZWxlY3RvcigpO1xuICBhd2FpdCBfcmVmcmVzaE1vZGVsQ2F0YWxvZ0ZvclNlbGVjdGlvbigpO1xuICBvdmVybGF5LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gIF9mb2N1c2VkRWxlbWVudEJlZm9yZU1vZGFsID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgc2V0SW5pdGlhbEZvY3VzKCdtb2RlbC1tb2RhbC1vdmVybGF5Jyk7XG4gIHRyYXBGb2N1cygnbW9kZWwtbW9kYWwtb3ZlcmxheScpO1xufVxuXG5mdW5jdGlvbiBjbG9zZU1vZGVsTW9kYWwoKSB7XG4gIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kZWwtbW9kYWwtb3ZlcmxheScpO1xuICBpZiAob3ZlcmxheSkgb3ZlcmxheS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICByZXN0b3JlRm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gX2FwcGx5TW9kZWxSb3dWaXN1YWxTdGF0ZSh0ciwgaXNBY3RpdmUpIHtcbiAgdHIuY2xhc3NMaXN0LnRvZ2dsZSgnbW9kZWwtcm93LWFjdGl2ZScsIGlzQWN0aXZlKTtcbiAgdHIuc3R5bGUuY3NzVGV4dCA9IGlzQWN0aXZlXG4gICAgPyAnYmFja2dyb3VuZDojZWZmNmZmOyBmb250LXdlaWdodDo2MDA7IGN1cnNvcjpwb2ludGVyOydcbiAgICA6ICdjdXJzb3I6cG9pbnRlcjsnO1xuXG4gIGNvbnN0IG1vZGVsID0gdHIuZ2V0QXR0cmlidXRlKCdkYXRhLW1vZGVsJykgfHwgJyc7XG4gIGNvbnN0IG1vZGVsQ2VsbCA9IHRyLmNlbGxzICYmIHRyLmNlbGxzWzFdO1xuICBpZiAobW9kZWxDZWxsKSB7XG4gICAgbW9kZWxDZWxsLmlubmVySFRNTCA9IGAke2VzY2FwZUh0bWwobW9kZWwpfWAgK1xuICAgICAgKGlzQWN0aXZlID8gJyA8c3BhbiBzdHlsZT1cImNvbG9yOiMzYjgyZjY7IGZvbnQtc2l6ZTowLjc1ZW07XCI+JiMxMDAwMzsgYWN0aXZlPC9zcGFuPicgOiAnJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3N5bmNNb2RlbFRhYmxlU2VsZWN0aW9uKCkge1xuICBjb25zdCB0Ym9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RlbC10YWJsZS1ib2R5Jyk7XG4gIGlmICghdGJvZHkgfHwgIV9tb2RlbERhdGEpIHJldHVybjtcblxuICBjb25zdCBhY3RpdmVQcm92aWRlciA9IF9tb2RlbERhdGEucHJvdmlkZXI7XG4gIGNvbnN0IGFjdGl2ZU1vZGVsID0gX21vZGVsRGF0YS5tb2RlbDtcbiAgdGJvZHkucXVlcnlTZWxlY3RvckFsbCgndHInKS5mb3JFYWNoKHRyID0+IHtcbiAgICBjb25zdCBpc0FjdGl2ZSA9IChcbiAgICAgIHRyLmdldEF0dHJpYnV0ZSgnZGF0YS1wcm92aWRlcicpID09PSBhY3RpdmVQcm92aWRlciAmJlxuICAgICAgdHIuZ2V0QXR0cmlidXRlKCdkYXRhLW1vZGVsJykgPT09IGFjdGl2ZU1vZGVsXG4gICAgKTtcbiAgICBfYXBwbHlNb2RlbFJvd1Zpc3VhbFN0YXRlKHRyLCBpc0FjdGl2ZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRNb2RlbFRhYmxlKCkge1xuICBjb25zdCB0Ym9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RlbC10YWJsZS1ib2R5Jyk7XG4gIGNvbnN0IHRoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLXRhYmxlLWhlYWQnKTtcbiAgaWYgKCF0Ym9keSB8fCAhX21vZGVsRGF0YSkgcmV0dXJuO1xuXG4gIGNvbnN0IGN1cnJlbnRQcm92aWRlciA9IF9tb2RlbERhdGEucHJvdmlkZXI7XG4gIGNvbnN0IGN1cnJlbnRNb2RlbCAgICA9IF9tb2RlbERhdGEubW9kZWw7XG5cbiAgLy8gRml4ZWQgNy1jb2x1bW4gaGVhZGVycyBcdTIwMTQgbm8gZHluYW1pYyByZWJ1aWxkaW5nIG5lZWRlZFxuICBpZiAodGhlYWQpIHtcbiAgICBjb25zdCB0aFMgPSAncGFkZGluZzoxMHB4IDE0cHg7IHdoaXRlLXNwYWNlOm5vd3JhcDsnO1xuICAgIHRoZWFkLmlubmVySFRNTCA9XG4gICAgICBgPHRyIHN0eWxlPVwiYmFja2dyb3VuZDojZjFmNWY5OyB0ZXh0LWFsaWduOmxlZnQ7XCI+YCArXG4gICAgICAgIGA8dGggc3R5bGU9XCIke3RoU31cIj5Qcm92aWRlcjwvdGg+YCArXG4gICAgICAgIGA8dGggc3R5bGU9XCIke3RoU31cIj5Nb2RlbDwvdGg+YCArXG4gICAgICAgIGA8dGggc3R5bGU9XCIke3RoU30gdGV4dC1hbGlnbjpyaWdodDtcIj5Db250ZXh0PC90aD5gICtcbiAgICAgICAgYDx0aCBzdHlsZT1cIiR7dGhTfSB0ZXh0LWFsaWduOnJpZ2h0O1wiIHRpdGxlPVwiVVNEIHBlciAxTSBpbnB1dCB0b2tlbnMgKGRpcmVjdCBBUEkgYmlsbGluZylcIj4kLzFNIGluPC90aD5gICtcbiAgICAgICAgYDx0aCBzdHlsZT1cIiR7dGhTfSB0ZXh0LWFsaWduOnJpZ2h0O1wiIHRpdGxlPVwiVVNEIHBlciAxTSBvdXRwdXQgdG9rZW5zIChkaXJlY3QgQVBJIGJpbGxpbmcpXCI+JC8xTSBvdXQ8L3RoPmAgK1xuICAgICAgICBgPHRoIHN0eWxlPVwiJHt0aFN9IHRleHQtYWxpZ246cmlnaHQ7XCIgdGl0bGU9XCJHaXRIdWIgQ29waWxvdCBwcmVtaXVtLXJlcXVlc3QgbXVsdGlwbGllciAoMCA9IGZyZWUgZm9yIHBhaWQgc3Vic2NyaWJlcnMpXCI+Q29waWxvdDwvdGg+YCArXG4gICAgICAgIGA8dGggc3R5bGU9XCIke3RoU31cIj5Tb3VyY2U8L3RoPmAgK1xuICAgICAgICBgPHRoIHN0eWxlPVwiJHt0aFN9XCI+Tm90ZXM8L3RoPmAgK1xuICAgICAgYDwvdHI+YDtcbiAgfVxuXG4gIC8vIFRlYXIgZG93biBhbnkgZXhpc3RpbmcgRGF0YVRhYmxlIGJlZm9yZSByZWJ1aWxkaW5nIHJvd3MuXG4gIGlmICh3aW5kb3cuJCAmJiAkLmZuICYmICQuZm4uRGF0YVRhYmxlICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKCcjbW9kZWwtdGFibGUnKSkge1xuICAgIHRyeSB7XG4gICAgICBfbW9kZWxEYXRhVGFibGUgPSAkKCcjbW9kZWwtdGFibGUnKS5EYXRhVGFibGUoKTtcbiAgICAgIF9tb2RlbERhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdEYXRhVGFibGUuZGVzdHJveSgpIGZhaWxlZCAodGFibGUgbWF5IGFscmVhZHkgYmUgdG9ybiBkb3duKTonLCBlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgX21vZGVsRGF0YVRhYmxlID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBQcmVmZXIgY3Jvc3MtcHJvdmlkZXIgbGlzdDsgZmFsbCBiYWNrIHRvIGN1cnJlbnQtcHJvdmlkZXIgYXZhaWxhYmxlIGxpc3RcbiAgbGV0IHJvd3MgPSAoX21vZGVsRGF0YS5hbGxfbW9kZWxzICYmIF9tb2RlbERhdGEuYWxsX21vZGVscy5sZW5ndGgpXG4gICAgPyBfbW9kZWxEYXRhLmFsbF9tb2RlbHMuZmlsdGVyKHIgPT4gci5tb2RlbClcbiAgICA6IChfbW9kZWxEYXRhLmF2YWlsYWJsZSB8fCBbXSkubWFwKHIgPT5cbiAgICAgICAgdHlwZW9mIHIgPT09ICdvYmplY3QnXG4gICAgICAgICAgPyB7IC4uLnIsIHByb3ZpZGVyOiBjdXJyZW50UHJvdmlkZXIgfVxuICAgICAgICAgIDogeyBtb2RlbDogciwgcHJvdmlkZXI6IGN1cnJlbnRQcm92aWRlciB9XG4gICAgICApO1xuXG4gIHRib2R5LmlubmVySFRNTCA9ICcnO1xuICBjb25zdCB0ZEJhc2UgID0gJ3BhZGRpbmc6OXB4IDE0cHg7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICNlMmU4ZjA7JztcbiAgY29uc3QgZm10Q29zdCA9IHYgPT4gKHYgIT0gbnVsbCkgPyAnJCcgKyBOdW1iZXIodikudG9GaXhlZCh2IDwgMSA/IDMgOiAyKSA6ICdcdTIwMTQnO1xuICBjb25zdCBmbXRQcmljZUhpbnQgPSBzb3VyY2UgPT4ge1xuICAgIGlmIChzb3VyY2UgPT09ICdydW50aW1lX2NhY2hlJykge1xuICAgICAgcmV0dXJuICc8c3BhbiB0aXRsZT1cIlByaWNlIGZyb20gcnVudGltZSBjYWNoZVwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6NnB4OyBkaXNwbGF5OmlubGluZS1ibG9jazsgcGFkZGluZzoxcHggNXB4OyBib3JkZXItcmFkaXVzOjk5OXB4OyBiYWNrZ3JvdW5kOiNlY2ZlZmY7IGNvbG9yOiMwZjc2NmU7IGZvbnQtc2l6ZTowLjcyZW07IGZvbnQtd2VpZ2h0OjYwMDsgdmVydGljYWwtYWxpZ246bWlkZGxlO1wiPmNhY2hlPC9zcGFuPic7XG4gICAgfVxuICAgIHJldHVybiAnPHNwYW4gdGl0bGU9XCJQcmljZSBmcm9tIHN0YXRpYyBiYXNlbGluZVwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6NnB4OyBkaXNwbGF5OmlubGluZS1ibG9jazsgcGFkZGluZzoxcHggNXB4OyBib3JkZXItcmFkaXVzOjk5OXB4OyBiYWNrZ3JvdW5kOiNmOGZhZmM7IGNvbG9yOiM2NDc0OGI7IGZvbnQtc2l6ZTowLjcyZW07IGZvbnQtd2VpZ2h0OjYwMDsgdmVydGljYWwtYWxpZ246bWlkZGxlO1wiPnN0YXRpYzwvc3Bhbj4nO1xuICB9O1xuICBjb25zdCBmbXRTb3VyY2UgPSBzID0+IHtcbiAgICBpZiAocyA9PT0gJ2xpc3RfbW9kZWxzJykge1xuICAgICAgcmV0dXJuICc8c3BhbiBzdHlsZT1cImRpc3BsYXk6aW5saW5lLWJsb2NrOyBwYWRkaW5nOjJweCA2cHg7IGJvcmRlci1yYWRpdXM6OTk5cHg7IGJhY2tncm91bmQ6I2VjZmVmZjsgY29sb3I6IzBmNzY2ZTsgZm9udC1zaXplOjAuNzhlbTsgZm9udC13ZWlnaHQ6NjAwO1wiPmxpc3RfbW9kZWxzPC9zcGFuPic7XG4gICAgfVxuICAgIHJldHVybiAnPHNwYW4gc3R5bGU9XCJkaXNwbGF5OmlubGluZS1ibG9jazsgcGFkZGluZzoycHggNnB4OyBib3JkZXItcmFkaXVzOjk5OXB4OyBiYWNrZ3JvdW5kOiNmMWY1Zjk7IGNvbG9yOiM0NzU1Njk7IGZvbnQtc2l6ZTowLjc4ZW07IGZvbnQtd2VpZ2h0OjYwMDtcIj5mYWxsYmFja19zdGF0aWM8L3NwYW4+JztcbiAgfTtcbiAgY29uc3QgZm10TXVsdCA9IHYgPT4ge1xuICAgIGlmICh2ID09IG51bGwpIHJldHVybiAnXHUyMDE0JztcbiAgICBpZiAodiA9PT0gMCkgICByZXR1cm4gJzxzcGFuIHN0eWxlPVwiY29sb3I6IzE2YTM0YTsgZm9udC13ZWlnaHQ6NjAwO1wiPmZyZWU8L3NwYW4+JztcbiAgICByZXR1cm4gTnVtYmVyKHYpLnRvRml4ZWQodiAlIDEgPT09IDAgPyAwIDogMikgKyAnJnRpbWVzOyc7XG4gIH07XG5cbiAgcm93cy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyICAgPSBpdGVtLnByb3ZpZGVyIHx8IGN1cnJlbnRQcm92aWRlcjtcbiAgICBjb25zdCBtICAgICAgICAgID0gaXRlbS5tb2RlbDtcbiAgICBjb25zdCBjdHggICAgICAgID0gaXRlbS5jb250ZXh0X3dpbmRvdyA/IE51bWJlcihpdGVtLmNvbnRleHRfd2luZG93KS50b0xvY2FsZVN0cmluZygpIDogJ1x1MjAxNCc7XG4gICAgY29uc3Qgc291cmNlICAgICA9IGl0ZW0uc291cmNlIHx8ICdmYWxsYmFja19zdGF0aWMnO1xuICAgIGNvbnN0IHByaWNlU291cmNlID0gaXRlbS5wcmljZV9zb3VyY2UgfHwgJ3N0YXRpY19iYXNlbGluZSc7XG4gICAgY29uc3Qgbm90ZXMgICAgICA9IGl0ZW0ubm90ZXMgfHwgJyc7XG4gICAgY29uc3QgaXNTZWxlY3RlZCA9IChwcm92aWRlciA9PT0gY3VycmVudFByb3ZpZGVyICYmIG0gPT09IGN1cnJlbnRNb2RlbCk7XG5cbiAgICBjb25zdCB0ciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgdHIuc2V0QXR0cmlidXRlKCdkYXRhLXByb3ZpZGVyJywgcHJvdmlkZXIpO1xuICAgIHRyLnNldEF0dHJpYnV0ZSgnZGF0YS1tb2RlbCcsIG0pO1xuICAgIF9hcHBseU1vZGVsUm93VmlzdWFsU3RhdGUodHIsIGlzU2VsZWN0ZWQpO1xuICAgIHRyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3ZlcicsICgpID0+IHtcbiAgICAgIGlmICghdHIuY2xhc3NMaXN0LmNvbnRhaW5zKCdtb2RlbC1yb3ctYWN0aXZlJykpIHRyLnN0eWxlLmJhY2tncm91bmQgPSAnI2Y4ZmFmYyc7XG4gICAgfSk7XG4gICAgdHIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCAoKSA9PiB7XG4gICAgICBpZiAoIXRyLmNsYXNzTGlzdC5jb250YWlucygnbW9kZWwtcm93LWFjdGl2ZScpKSB0ci5zdHlsZS5iYWNrZ3JvdW5kID0gJyc7XG4gICAgfSk7XG5cbiAgICB0ci5pbm5lckhUTUwgPVxuICAgICAgYDx0ZCBzdHlsZT1cIiR7dGRCYXNlfSBjb2xvcjojNjQ3NDhiOyB3aGl0ZS1zcGFjZTpub3dyYXA7XCI+JHtlc2NhcGVIdG1sKHByb3ZpZGVyKX08L3RkPmAgK1xuICAgICAgYDx0ZCBzdHlsZT1cIiR7dGRCYXNlfVwiPiR7ZXNjYXBlSHRtbChtKX08L3RkPmAgK1xuICAgICAgYDx0ZCBzdHlsZT1cIiR7dGRCYXNlfSB3aGl0ZS1zcGFjZTpub3dyYXA7IHRleHQtYWxpZ246cmlnaHQ7IGZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtcztcIj4ke2N0eH08L3RkPmAgK1xuICAgICAgYDx0ZCBzdHlsZT1cIiR7dGRCYXNlfSB0ZXh0LWFsaWduOnJpZ2h0OyBmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXM7IHdoaXRlLXNwYWNlOm5vd3JhcDtcIj4ke2ZtdENvc3QoaXRlbS5jb3N0X2lucHV0KX0ke2ZtdFByaWNlSGludChwcmljZVNvdXJjZSl9PC90ZD5gICtcbiAgICAgIGA8dGQgc3R5bGU9XCIke3RkQmFzZX0gdGV4dC1hbGlnbjpyaWdodDsgZm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zOyB3aGl0ZS1zcGFjZTpub3dyYXA7XCI+JHtmbXRDb3N0KGl0ZW0uY29zdF9vdXRwdXQpfSR7Zm10UHJpY2VIaW50KHByaWNlU291cmNlKX08L3RkPmAgK1xuICAgICAgYDx0ZCBzdHlsZT1cIiR7dGRCYXNlfSB0ZXh0LWFsaWduOnJpZ2h0OyBmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXM7IHdoaXRlLXNwYWNlOm5vd3JhcDtcIj4ke2ZtdE11bHQoaXRlbS5jb3BpbG90X211bHRpcGxpZXIpfTwvdGQ+YCArXG4gICAgICBgPHRkIHN0eWxlPVwiJHt0ZEJhc2V9IHdoaXRlLXNwYWNlOm5vd3JhcDtcIj4ke2ZtdFNvdXJjZShzb3VyY2UpfTwvdGQ+YCArXG4gICAgICBgPHRkIHN0eWxlPVwiJHt0ZEJhc2V9IGNvbG9yOiM2NDc0OGI7XCI+JHtub3Rlc308L3RkPmA7XG4gICAgdGJvZHkuYXBwZW5kQ2hpbGQodHIpO1xuICB9KTtcblxuICAvLyBSZWJpbmQgcm93IGNsaWNrIHVzaW5nIGRlbGVnYXRpb24gc28gc29ydGluZy9maWx0ZXIgcmVkcmF3cyBzdGlsbCB3b3JrLlxuICB0Ym9keS5vbmNsaWNrID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgdHIgPSBldmVudC50YXJnZXQuY2xvc2VzdCgndHInKTtcbiAgICBpZiAoIXRyKSByZXR1cm47XG4gICAgY29uc3QgcHJvdmlkZXIgPSB0ci5nZXRBdHRyaWJ1dGUoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICBjb25zdCBtb2RlbCA9IHRyLmdldEF0dHJpYnV0ZSgnZGF0YS1tb2RlbCcpO1xuICAgIGlmICghbW9kZWwpIHJldHVybjtcblxuICAgIC8vIEltbWVkaWF0ZSBmZWVkYmFjayB3aGlsZSB0aGUgQVBJIGNhbGwgaXMgaW4tZmxpZ2h0XG4gICAgdHIuc3R5bGUuY3NzVGV4dCA9ICdiYWNrZ3JvdW5kOiNmZWYzYzc7IGN1cnNvcjp3YWl0OyBvcGFjaXR5OjAuODU7JztcbiAgICBjb25zdCBtb2RlbENlbGwgPSB0ci5jZWxscyAmJiB0ci5jZWxsc1sxXTtcbiAgICBpZiAobW9kZWxDZWxsKSB7XG4gICAgICBtb2RlbENlbGwuaW5uZXJIVE1MID1cbiAgICAgICAgYDxzcGFuIGNsYXNzPVwibG9hZGluZy1zcGlubmVyXCIgc3R5bGU9XCJ3aWR0aDoxNHB4O2hlaWdodDoxNHB4O2JvcmRlci13aWR0aDoycHg7dmVydGljYWwtYWxpZ246bWlkZGxlO21hcmdpbi1yaWdodDo2cHg7XCI+PC9zcGFuPiR7ZXNjYXBlSHRtbChtb2RlbCl9YDtcbiAgICB9XG4gICAgY29uc3Qgc3RhdHVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLXRlc3Qtc3RhdHVzJyk7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgc3RhdHVzLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIHN0YXR1cy5zdHlsZS5jb2xvciAgID0gJyM5MjQwMGUnO1xuICAgICAgc3RhdHVzLmlubmVySFRNTCAgICAgPVxuICAgICAgICBgPHNwYW4gY2xhc3M9XCJsb2FkaW5nLXNwaW5uZXJcIiBzdHlsZT1cIndpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7Ym9yZGVyLXdpZHRoOjJweDt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7bWFyZ2luLXJpZ2h0OjZweDtcIj48L3NwYW4+IFN3aXRjaGluZyB0byAke2VzY2FwZUh0bWwobW9kZWwpfVxcdTIwMjZgO1xuICAgIH1cblxuICAgIGF3YWl0IHNldE1vZGVsKG1vZGVsLCBwcm92aWRlcik7XG4gIH07XG5cbiAgLy8gRW5oYW5jZSB3aXRoIERhdGFUYWJsZXMgZm9yIHNvcnRpbmcvc2VhcmNoaW5nOyBrZWVwIHBhZ2luZyBkaXNhYmxlZC5cbiAgaWYgKHdpbmRvdy4kICYmICQuZm4gJiYgJC5mbi5EYXRhVGFibGUpIHtcbiAgICBfbW9kZWxEYXRhVGFibGUgPSAkKCcjbW9kZWwtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgIGluZm86IGZhbHNlLFxuICAgICAgb3JkZXJDZWxsc1RvcDogdHJ1ZSxcbiAgICAgIG9yZGVyOiBbWzAsICdhc2MnXSwgWzEsICdhc2MnXV0sXG4gICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgbGFuZ3VhZ2U6IHsgc2VhcmNoOiAnRmlsdGVyOicgfSxcbiAgICAgIGluaXRDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGFwaSA9IHRoaXMuYXBpKCk7XG4gICAgICAgIGNvbnN0ICR0aGVhZCA9ICQoJyNtb2RlbC10YWJsZSB0aGVhZCcpO1xuICAgICAgICBjb25zdCBoYXNGaWx0ZXJSb3cgPSAkdGhlYWQuZmluZCgndHIubW9kZWwtZmlsdGVyLXJvdycpLmxlbmd0aCA+IDA7XG4gICAgICAgIGlmICghaGFzRmlsdGVyUm93KSB7XG4gICAgICAgICAgY29uc3QgJGZpbHRlclJvdyA9ICQoJzx0ciBjbGFzcz1cIm1vZGVsLWZpbHRlci1yb3dcIj48L3RyPicpO1xuICAgICAgICAgIGFwaS5jb2x1bW5zKCkuZXZlcnkoZnVuY3Rpb24oY29sSWR4KSB7XG4gICAgICAgICAgICBjb25zdCB0aXRsZSA9ICQoYXBpLmNvbHVtbihjb2xJZHgpLmhlYWRlcigpKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgJHRoID0gJCgnPHRoIHN0eWxlPVwicGFkZGluZzo2cHggMTBweDsgYmFja2dyb3VuZDojZjhmYWZjOyBib3JkZXItdG9wOjFweCBzb2xpZCAjZTJlOGYwO1wiPjwvdGg+Jyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKGA8aW5wdXQgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cIiR7dGl0bGV9XCIgc3R5bGU9XCJ3aWR0aDoxMDAlOyBwYWRkaW5nOjRweCA2cHg7IGJvcmRlcjoxcHggc29saWQgI2NiZDVlMTsgYm9yZGVyLXJhZGl1czo0cHg7IGZvbnQtc2l6ZTowLjgyZW07XCIgLz5gKTtcbiAgICAgICAgICAgICR0aC5hcHBlbmQoJGlucHV0KTtcbiAgICAgICAgICAgICRmaWx0ZXJSb3cuYXBwZW5kKCR0aCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgJHRoZWFkLmFwcGVuZCgkZmlsdGVyUm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFwaS5jb2x1bW5zKCkuZXZlcnkoZnVuY3Rpb24oY29sSWR4KSB7XG4gICAgICAgICAgY29uc3QgJGlucHV0ID0gJCgnI21vZGVsLXRhYmxlIHRoZWFkIHRyLm1vZGVsLWZpbHRlci1yb3cgdGgnKS5lcShjb2xJZHgpLmZpbmQoJ2lucHV0Jyk7XG4gICAgICAgICAgaWYgKCEkaW5wdXQubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgJGlucHV0Lm9mZignY2xpY2subW9kZWxGaWx0ZXIga2V5dXAubW9kZWxGaWx0ZXIgY2hhbmdlLm1vZGVsRmlsdGVyJyk7XG4gICAgICAgICAgJGlucHV0Lm9uKCdjbGljay5tb2RlbEZpbHRlcicsIGZ1bmN0aW9uKGV2ZW50KSB7IGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyB9KTtcbiAgICAgICAgICAkaW5wdXQub24oJ2tleXVwLm1vZGVsRmlsdGVyIGNoYW5nZS5tb2RlbEZpbHRlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICAgICAgaWYgKGFwaS5jb2x1bW4oY29sSWR4KS5zZWFyY2goKSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgYXBpLmNvbHVtbihjb2xJZHgpLnNlYXJjaCh2YWx1ZSkuZHJhdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBfc3luY01vZGVsVGFibGVTZWxlY3Rpb24oKTtcblxuICAvLyBVcGRhdGUgcHJpY2luZyBmcmVzaG5lc3MgZm9vdGVyXG4gIF91cGRhdGVQcmljaW5nRm9vdGVyKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNldE1vZGVsKG1vZGVsLCBwcm92aWRlcikge1xuICBpZiAoIW1vZGVsKSByZXR1cm47XG4gIHRyeSB7XG4gICAgY29uc3QgcGF5bG9hZCA9IHByb3ZpZGVyID8geyBtb2RlbCwgcHJvdmlkZXIgfSA6IHsgbW9kZWwgfTtcbiAgICBhd2FpdCBhcGlDYWxsKCdQT1NUJywgJy9hcGkvbW9kZWwnLCBwYXlsb2FkKTtcbiAgICBpZiAoX21vZGVsRGF0YSkge1xuICAgICAgX21vZGVsRGF0YS5tb2RlbCAgICA9IG1vZGVsO1xuICAgICAgaWYgKHByb3ZpZGVyKSBfbW9kZWxEYXRhLnByb3ZpZGVyID0gcHJvdmlkZXI7XG4gICAgfVxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLWN1cnJlbnQtbGFiZWwnKTtcbiAgICBpZiAobGFiZWwpIHtcbiAgICAgIGNvbnN0IHByb3YgPSAoX21vZGVsRGF0YSAmJiBfbW9kZWxEYXRhLnByb3ZpZGVyKSB8fCBwcm92aWRlcjtcbiAgICAgIGxhYmVsLnRleHRDb250ZW50ICA9IHByb3YgPyBgJHtwcm92fSBcdTAwQjcgJHttb2RlbH1gIDogbW9kZWw7XG4gICAgfVxuICAgIF9zeW5jTW9kZWxUYWJsZVNlbGVjdGlvbigpO1xuICAgIC8vIEtlZXAgdGhlIG1vZGFsIG9wZW4gc28gdGhlIHVzZXIgY2FuIGNsaWNrIFwiVGVzdCBjb25uZWN0aW9uXCJcbiAgICAvLyBGaXJlLWFuZC1mb3JnZXQgY29ubmVjdGlvbiB0ZXN0IHNvIHRoZSByZXN1bHQgYXBwZWFycyBpbW1lZGlhdGVseVxuICAgIHRlc3RDdXJyZW50TW9kZWwoKTtcbiAgICAvLyBQZXJzaXN0IHNlbGVjdGlvbiBsb2NhbGx5IHNvIGl0IHN1cnZpdmVzIGZyb250ZW5kIHJlbG9hZHMgZXZlbiBpZiBiYWNrZW5kXG4gICAgLy8gZG9lcyBub3QgcGVyc2lzdCB0aGUgY2hvaWNlLlxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzYXZlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBKTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHNhdmVkID8gSlNPTi5wYXJzZShzYXZlZCkgOiB7fTtcbiAgICAgIHBhcnNlZC5jdXJyZW50TW9kZWxQcm92aWRlciA9IHByb3ZpZGVyIHx8IChfbW9kZWxEYXRhICYmIF9tb2RlbERhdGEucHJvdmlkZXIpIHx8IG51bGw7XG4gICAgICBwYXJzZWQuY3VycmVudE1vZGVsTmFtZSA9IG1vZGVsIHx8IChfbW9kZWxEYXRhICYmIF9tb2RlbERhdGEubW9kZWwpIHx8IG51bGw7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTdG9yYWdlS2V5cy5UQUJfREFUQSwgSlNPTi5zdHJpbmdpZnkocGFyc2VkKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gcGVyc2lzdCBtb2RlbCBzZWxlY3Rpb24gbG9jYWxseTonLCBlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc3dpdGNoIG1vZGVsOicsIGUpO1xuICAgIGNvbnN0IG1zZyA9IGUubWVzc2FnZSB8fCBTdHJpbmcoZSk7XG4gICAgX3N5bmNNb2RlbFRhYmxlU2VsZWN0aW9uKCk7XG4gICAgY29uc3Qgc3RhdHVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLXRlc3Qtc3RhdHVzJyk7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgc3RhdHVzLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIHN0YXR1cy5zdHlsZS5jb2xvciA9ICcjZGMyNjI2JztcbiAgICAgIHN0YXR1cy50ZXh0Q29udGVudCA9IGBcdTI3NEMgJHttc2d9YDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhcHBlbmRNZXNzYWdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhcHBlbmRNZXNzYWdlKCdzeXN0ZW0nLCBgXHUyNzRDIE1vZGVsIHN3aXRjaCBmYWlsZWQ6ICR7bXNnfWApO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB0ZXN0Q3VycmVudE1vZGVsKCkge1xuICAvLyBVcGRhdGUgYm90aCB0aGUgaGVhZGVyIGJhZGdlIGFuZCB0aGUgbW9kYWwgc3RhdHVzIGxpbmVcbiAgY29uc3QgYmFkZ2UgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLXRlc3QtYmFkZ2UnKTtcbiAgY29uc3Qgc3RhdHVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsLXRlc3Qtc3RhdHVzJyk7XG4gIGNvbnN0IGJ0biAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RlbC10ZXN0LWJ0bicpO1xuXG4gIGNvbnN0IFNQSU4gPSAnXHUyM0YzJztcbiAgY29uc3QgT0sgICA9ICdcdTI3MDUnO1xuICBjb25zdCBGQUlMID0gJ1x1Mjc0Qyc7XG5cbiAgY29uc3Qgc2V0UnVubmluZyA9ICgpID0+IHtcbiAgICBpZiAoYmFkZ2UpICB7IGJhZGdlLnRleHRDb250ZW50ICA9IFNQSU47IGJhZGdlLnN0eWxlLmRpc3BsYXkgID0gJyc7IGJhZGdlLnRpdGxlICA9ICdUZXN0aW5nXHUyMDI2JzsgfVxuICAgIGlmIChzdGF0dXMpIHsgc3RhdHVzLmlubmVySFRNTCAgID0gYCR7U1BJTn0gVGVzdGluZyBjb25uZWN0aW9uXHUyMDI2YDsgc3RhdHVzLnN0eWxlLmRpc3BsYXkgPSAnJzsgfVxuICAgIGlmIChidG4pICAgIHsgYnRuLmRpc2FibGVkID0gdHJ1ZTsgYnRuLnRleHRDb250ZW50ID0gJ1x1MjNGMyBUZXN0aW5nXHUyMDI2JzsgfVxuICB9O1xuXG4gIGNvbnN0IHNldE9rID0gKGxhdGVuY3lNcykgPT4ge1xuICAgIGNvbnN0IHRpcCA9IGBDb25uZWN0ZWQgXHUyMDE0ICR7bGF0ZW5jeU1zfW1zYDtcbiAgICBpZiAoYmFkZ2UpICB7IGJhZGdlLnRleHRDb250ZW50ICA9IE9LOyAgYmFkZ2Uuc3R5bGUuZGlzcGxheSAgPSAnJzsgYmFkZ2UudGl0bGUgID0gdGlwOyB9XG4gICAgaWYgKHN0YXR1cykgeyBzdGF0dXMuaW5uZXJIVE1MICAgPSBgJHtPS30gJHt0aXB9YDsgc3RhdHVzLnN0eWxlLmNvbG9yID0gJyMxNmEzNGEnOyBzdGF0dXMuc3R5bGUuZGlzcGxheSA9ICcnOyB9XG4gICAgaWYgKGJ0bikgICAgeyBidG4uZGlzYWJsZWQgPSBmYWxzZTsgYnRuLmlubmVySFRNTCA9ICcmIzEwMDAzOyBUZXN0IGNvbm5lY3Rpb24nOyB9XG4gICAgLy8gQXV0by1jbGVhciB0aGUgYmFkZ2UgYWZ0ZXIgMzAgcyBzbyBpdCBkb2Vzbid0IGxpbmdlciBmb3JldmVyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoYmFkZ2UgICYmIGJhZGdlLnRleHRDb250ZW50ICA9PT0gT0spICBiYWRnZS5zdHlsZS5kaXNwbGF5ICA9ICdub25lJztcbiAgICAgIGlmIChzdGF0dXMgJiYgc3RhdHVzLnRleHRDb250ZW50LmluY2x1ZGVzKHRpcCkpIHN0YXR1cy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH0sIDMwXzAwMCk7XG4gIH07XG5cbiAgY29uc3Qgc2V0RmFpbCA9IChlcnJNc2cpID0+IHtcbiAgICBpZiAoYmFkZ2UpICB7IGJhZGdlLnRleHRDb250ZW50ICA9IEZBSUw7IGJhZGdlLnN0eWxlLmRpc3BsYXkgID0gJyc7IGJhZGdlLnRpdGxlICA9IGVyck1zZzsgfVxuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgIHN0YXR1cy5pbm5lckhUTUwgICA9IGAke0ZBSUx9IDxzcGFuIHRpdGxlPVwiJHtlcnJNc2cucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiIHN0eWxlPVwiY3Vyc29yOmhlbHA7IHRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmUgZG90dGVkO1wiPkNvbm5lY3Rpb24gZmFpbGVkPC9zcGFuPmA7XG4gICAgICBzdGF0dXMuc3R5bGUuY29sb3IgPSAnI2RjMjYyNic7XG4gICAgICBzdGF0dXMuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgIH1cbiAgICBpZiAoYnRuKSAgICB7IGJ0bi5kaXNhYmxlZCA9IGZhbHNlOyBidG4uaW5uZXJIVE1MID0gJyYjMTAwMDM7IFRlc3QgY29ubmVjdGlvbic7IH1cbiAgfTtcblxuICBzZXRSdW5uaW5nKCk7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYXBpQ2FsbCgnUE9TVCcsICcvYXBpL21vZGVsL3Rlc3QnKTtcbiAgICBpZiAocmVzdWx0Lm9rKSB7XG4gICAgICBzZXRPayhyZXN1bHQubGF0ZW5jeV9tcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldEZhaWwocmVzdWx0LmVycm9yIHx8ICdVbmtub3duIGVycm9yJyk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgc2V0RmFpbChlLm1lc3NhZ2UgfHwgU3RyaW5nKGUpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfdXBkYXRlUHJpY2luZ0Zvb3RlcigpIHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJpY2luZy11cGRhdGVkLWxhYmVsJyk7XG4gIGlmICghZWwgfHwgIV9tb2RlbERhdGEpIHJldHVybjtcbiAgY29uc3QgdHMgICAgID0gX21vZGVsRGF0YS5wcmljaW5nX3VwZGF0ZWRfYXQ7XG4gIGNvbnN0IHNvdXJjZSA9IF9tb2RlbERhdGEucHJpY2luZ19zb3VyY2U7XG5cbiAgY29uc3Qgc291cmNlTGFiZWwgPSAoc291cmNlID09PSAnb3BlbnJvdXRlcicpXG4gICAgPyAnPGEgaHJlZj1cImh0dHBzOi8vb3BlbnJvdXRlci5haVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyXCIgJyArXG4gICAgICAnc3R5bGU9XCJjb2xvcjppbmhlcml0OyB0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lIGRvdHRlZDtcIj5PcGVuUm91dGVyPC9hPidcbiAgICA6ICdzdGF0aWMgYmFzZWxpbmUgKE1hcmNoIDIwMjYpJztcblxuICBpZiAoIXRzKSB7IGVsLmlubmVySFRNTCA9IGBQcmljZXM6ICR7c291cmNlTGFiZWx9YDsgcmV0dXJuOyB9XG4gIHRyeSB7XG4gICAgY29uc3QgZCAgID0gbmV3IERhdGUodHMpO1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgaCAgID0gTWF0aC5yb3VuZCgobm93IC0gZCkgLyAzXzYwMF8wMDApO1xuICAgIGNvbnN0IGFnZSA9IGggPCAxID8gJ2p1c3Qgbm93JyA6IGggPCAyNCA/IGAke2h9aCBhZ29gIDogYCR7TWF0aC5yb3VuZChoIC8gMjQpfWQgYWdvYDtcbiAgICBlbC5pbm5lckhUTUwgPSBgUHJpY2VzIHZpYSAke3NvdXJjZUxhYmVsfSAmbWlkZG90OyB1cGRhdGVkICR7YWdlfWA7XG4gIH0gY2F0Y2ggeyBlbC5pbm5lckhUTUwgPSBgUHJpY2VzOiAke3NvdXJjZUxhYmVsfWA7IH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVmcmVzaE1vZGVsUHJpY2luZygpIHtcbiAgY29uc3QgYnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByaWNpbmctcmVmcmVzaC1idG4nKTtcbiAgY29uc3QgbGJsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByaWNpbmctdXBkYXRlZC1sYWJlbCcpO1xuICBpZiAoYnRuKSB7IGJ0bi5kaXNhYmxlZCA9IHRydWU7IGJ0bi50ZXh0Q29udGVudCA9ICdSZWZyZXNoaW5nXHUyMDI2JzsgfVxuICB0cnkge1xuICAgIGF3YWl0IGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9tb2RlbC1wcmljaW5nL3JlZnJlc2gnKTtcbiAgICAvLyBSZS1mZXRjaCBtb2RlbCBkYXRhIHNvIHRoZSB0YWJsZSBnZXRzIGZyZXNoIHByaWNlc1xuICAgIF9tb2RlbERhdGEgPSBhd2FpdCBhcGlDYWxsKCdHRVQnLCAnL2FwaS9tb2RlbCcpO1xuICAgIF9idWlsZE1vZGVsVGFibGUoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChsYmwpIGxibC50ZXh0Q29udGVudCA9ICdSZWZyZXNoIGZhaWxlZCc7XG4gICAgY29uc29sZS5lcnJvcignUHJpY2luZyByZWZyZXNoIGZhaWxlZDonLCBlKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBpZiAoYnRuKSB7IGJ0bi5kaXNhYmxlZCA9IGZhbHNlOyBidG4udGV4dENvbnRlbnQgPSAnXHUyMUJCIFJlZnJlc2ggcHJpY2VzJzsgfVxuICB9XG59XG5cbi8vIEluaXRpYWxpemUgb24gcGFnZSBsb2FkIFx1MjAxNCBkZWxlZ2F0ZXMgdG8gYXBwLmpzIGluaXQoKSB3aGljaCBpcyBsb2FkZWQgYWZ0ZXIgdGhpcyBmaWxlXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBsb2FkTW9kZWxTZWxlY3RvcigpO1xuXG4gIC8vIFdpcmUgdXAgdGFiIHNjcm9sbCBhcnJvdyBidXR0b25zXG4gIGNvbnN0IHRhYkJhciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RhYi1iYXInKTtcbiAgY29uc3QgbGVmdEJ0biAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGFiLXNjcm9sbC1sZWZ0Jyk7XG4gIGNvbnN0IHJpZ2h0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RhYi1zY3JvbGwtcmlnaHQnKTtcbiAgaWYgKHRhYkJhciAmJiBsZWZ0QnRuICYmIHJpZ2h0QnRuKSB7XG4gICAgbGVmdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICAoKSA9PiB7IHRhYkJhci5zY3JvbGxCeSh7IGxlZnQ6IC0xNjAsIGJlaGF2aW9yOiAnc21vb3RoJyB9KTsgfSk7XG4gICAgcmlnaHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7IHRhYkJhci5zY3JvbGxCeSh7IGxlZnQ6ICAxNjAsIGJlaGF2aW9yOiAnc21vb3RoJyB9KTsgfSk7XG4gICAgdGFiQmFyLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHVwZGF0ZVRhYlNjcm9sbEJ1dHRvbnMpO1xuICAgIG5ldyBSZXNpemVPYnNlcnZlcih1cGRhdGVUYWJTY3JvbGxCdXR0b25zKS5vYnNlcnZlKHRhYkJhcik7XG4gIH1cblxuICAvLyBTaG93IG9ubHkgdGhlIEpvYiB0YWIgdW50aWwgZmV0Y2hTdGF0dXMgcmVzb2x2ZXMgdGhlIGFjdHVhbCBzdGFnZVxuICB1cGRhdGVUYWJCYXJGb3JTdGFnZSgnam9iJyk7XG5cbiAgaWYgKHR5cGVvZiBpbml0ID09PSAnZnVuY3Rpb24nKSBpbml0KCk7XG59KTtcblxuLy8gXHUyNTAwXHUyNTAwIEVTIG1vZHVsZSBleHBvcnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHtcbiAgLy8gRm9jdXMgLyBhY2Nlc3NpYmlsaXR5XG4gIHNldEluaXRpYWxGb2N1cywgdHJhcEZvY3VzLCByZXN0b3JlRm9jdXMsXG4gIC8vIERpYWxvZ3MgJiBtb2RhbHNcbiAgY29uZmlybURpYWxvZywgb3Blbk1vZGFsLCBjbG9zZU1vZGFsLCBjbG9zZUFsbE1vZGFscyxcbiAgc2hvd1Nlc3Npb25Db25mbGljdEJhbm5lciwgc2hvd0FsZXJ0TW9kYWwsIGNsb3NlQWxlcnRNb2RhbCxcbiAgLy8gVGFiICYgc3RhZ2UgbWFuYWdlbWVudFxuICBzZXR1cEV2ZW50TGlzdGVuZXJzLCBnZXRTdGFnZUZvclRhYiwgdXBkYXRlVGFiQmFyRm9yU3RhZ2UsIHN3aXRjaFN0YWdlLCBsb2FkVGFiQ29udGVudCxcbiAgLy8gQ2hhdFxuICB0b2dnbGVDaGF0LFxuICAvLyBQaGFzZSAvIHN0YXR1c1xuICBpbml0aWFsaXplLCBkaXNwbGF5TWVzc2FnZSwgdXBkYXRlUGhhc2VJbmRpY2F0b3IsIHNldENvbnRyb2xzRW5hYmxlZCxcbiAgLy8gTW9kZWwgc2VsZWN0b3JcbiAgbG9hZE1vZGVsU2VsZWN0b3IsIG9wZW5Nb2RlbE1vZGFsLCBjbG9zZU1vZGVsTW9kYWwsIHNldE1vZGVsLCB0ZXN0Q3VycmVudE1vZGVsLCByZWZyZXNoTW9kZWxQcmljaW5nLFxufTtcbiIsICIvKipcbiAqIGxheW91dC1pbnN0cnVjdGlvbi5qc1xuICogRnJvbnRlbmQgVUkgZm9yIG5hdHVyYWwtbGFuZ3VhZ2UgbGF5b3V0IGluc3RydWN0aW9uIHdvcmtmbG93LlxuICogSGFuZGxlcyBpbnN0cnVjdGlvbiBzdWJtaXNzaW9uLCBwcmV2aWV3IHVwZGF0ZXMsIGFuZCBpbnN0cnVjdGlvbiBoaXN0b3J5LlxuICovXG5cbmltcG9ydCB7IGFwaUNhbGwgfSBmcm9tICcuL2FwaS1jbGllbnQuanMnO1xuaW1wb3J0IHsgc3RhdGVNYW5hZ2VyIH0gZnJvbSAnLi9zdGF0ZS1tYW5hZ2VyLmpzJztcblxuLyoqXG4gKiBJbml0aWFsaXplIGxheW91dCBpbnN0cnVjdGlvbiBVSSBhbmQgZXZlbnQgaGFuZGxlcnMuXG4gKiBDYWxsZWQgd2hlbiBsYXlvdXQgdGFiIGlzIGFjdGl2YXRlZC5cbiAqL1xuZnVuY3Rpb24gaW5pdGlhdGVMYXlvdXRJbnN0cnVjdGlvbnMoKSB7XG4gIGNvbnN0IGluc3RydWN0aW9uVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RvY3VtZW50LWNvbnRlbnQnKTtcbiAgaWYgKCFpbnN0cnVjdGlvblRhYikgcmV0dXJuO1xuXG4gIC8vIENyZWF0ZSB0d28tY29sdW1uIGxheW91dCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gIGlmICghaW5zdHJ1Y3Rpb25UYWIucXVlcnlTZWxlY3RvcignLmxheW91dC1pbnN0cnVjdGlvbi1wYW5lbCcpKSB7XG4gICAgaW5zdHJ1Y3Rpb25UYWIuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImxheW91dC1pbnN0cnVjdGlvbi1wYW5lbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGF5b3V0LXByZXZpZXctcGFuZVwiPlxuICAgICAgICAgIDxoMz5DdXJyZW50IExheW91dCBQcmV2aWV3PC9oMz5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJldmlldy1pZnJhbWUtY29udGFpbmVyXCI+XG4gICAgICAgICAgICA8aWZyYW1lIGlkPVwibGF5b3V0LXByZXZpZXdcIiBjbGFzcz1cImxheW91dC1wcmV2aWV3LWlmcmFtZVwiIHRpdGxlPVwiQ1YgTGF5b3V0IFByZXZpZXdcIj48L2lmcmFtZT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxheW91dC1pbnB1dC1wYW5lXCI+XG4gICAgICAgICAgPGgzPkxheW91dCBJbnN0cnVjdGlvbnM8L2gzPlxuICAgICAgICAgIDxwIGNsYXNzPVwibGF5b3V0LXNjb3BlLWxhYmVsXCI+XHVEODNEXHVEQ0ExIExheW91dCBjaGFuZ2VzIG9ubHkgXHUyMDE0IGFwcHJvdmVkIHRleHQgaXMgbmV2ZXIgbW9kaWZpZWQ8L3A+XG5cbiAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgIGlkPVwiaW5zdHJ1Y3Rpb24taW5wdXRcIlxuICAgICAgICAgICAgY2xhc3M9XCJsYXlvdXQtaW5zdHJ1Y3Rpb24tdGV4dGFyZWFcIlxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJlLmcuLCBNb3ZlIFB1YmxpY2F0aW9ucyBzZWN0aW9uIGFmdGVyIFNraWxscyYjMTA7b3I6IE1ha2UgdGhlIFN1bW1hcnkgc2VjdGlvbiBzbWFsbGVyJiMxMDtvcjogS2VlcCB0aGUgR2VuZW50ZWNoIGVudHJ5IG9uIG9uZSBwYWdlXCJcbiAgICAgICAgICAgIHJvd3M9XCI4XCI+PC90ZXh0YXJlYT5cblxuICAgICAgICAgIDxidXR0b24gaWQ9XCJhcHBseS1pbnN0cnVjdGlvbi1idG5cIiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeSBsYXlvdXQtYWN0aW9uLWJ0blwiPlxuICAgICAgICAgICAgQXBwbHkgSW5zdHJ1Y3Rpb25cbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIDxkaXYgaWQ9XCJwcm9jZXNzaW5nLWluZGljYXRvclwiIGNsYXNzPVwicHJvY2Vzc2luZy1pbmRpY2F0b3JcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PlxuICAgICAgICAgICAgPHA+QXBwbHlpbmcgaW5zdHJ1Y3Rpb24uLi48L3A+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGlkPVwiY29uZmlybWF0aW9uLW1lc3NhZ2VcIiBjbGFzcz1cImNvbmZpcm1hdGlvbi1tZXNzYWdlXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPjwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImxheW91dC1oaXN0b3J5LXNlY3Rpb25cIj5cbiAgICAgICAgICAgIDxoND5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJoaXN0b3J5LXRvZ2dsZVwiPlx1MjVCQzwvc3Bhbj5cbiAgICAgICAgICAgICAgSW5zdHJ1Y3Rpb24gSGlzdG9yeSAoPHNwYW4gaWQ9XCJpbnN0cnVjdGlvbi1jb3VudFwiPjA8L3NwYW4+KVxuICAgICAgICAgICAgPC9oND5cbiAgICAgICAgICAgIDxkaXYgaWQ9XCJpbnN0cnVjdGlvbi1oaXN0b3J5XCIgY2xhc3M9XCJpbnN0cnVjdGlvbi1oaXN0b3J5LWxpc3RcIj48L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxidXR0b24gaWQ9XCJwcm9jZWVkLXRvLWZpbmFsaXNlLWJ0blwiIGNsYXNzPVwiYnRuIGJ0bi1zdWNjZXNzIGxheW91dC1hY3Rpb24tYnRuXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgUHJvY2VlZCB0byBGaW5hbCBHZW5lcmF0aW9uXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIC8vIFdpcmUgdXAgZXZlbnQgbGlzdGVuZXJzXG4gICAgc2V0dXBMYXlvdXRJbnN0cnVjdGlvbkxpc3RlbmVycygpO1xuICB9XG5cbiAgLy8gTG9hZCBhbmQgZGlzcGxheSBjdXJyZW50IEhUTUwgcHJldmlldyB2aWEgdGhlIHN0YWdlZCBnZW5lcmF0aW9uIGNvbnRyYWN0LlxuICAvLyAvYXBpL2N2L2dlbmVyYXRlLXByZXZpZXcgZ2VuZXJhdGVzIGZyZXNoIEhUTUwgYW5kIHN0b3JlcyBpdCBpbiBzZXNzaW9uIHN0YXRlLlxuICAvLyBGYWxsIGJhY2sgdG8gdGhlIGxlZ2FjeSAvYXBpL2xheW91dC1odG1sIGVuZHBvaW50IGlmIHRoZSBzZXNzaW9uIGhhcyBub1xuICAvLyBjdXN0b21pemF0aW9uIGRhdGEgeWV0IChlLmcuIHNlc3Npb24gcmVzdG9yZWQgYWZ0ZXIgZnVsbCBnZW5lcmF0aW9uKS5cbiAgY29uc3QgY2FjaGVkSHRtbCA9IHdpbmRvdy50YWJEYXRhPy5jdj8uWycqLmh0bWwnXSB8fCAnJztcbiAgaWYgKGNhY2hlZEh0bWwpIHtcbiAgICBkaXNwbGF5TGF5b3V0UHJldmlldyhjYWNoZWRIdG1sKTtcbiAgfSBlbHNlIHtcbiAgICBfZmV0Y2hBbmREaXNwbGF5TGF5b3V0UHJldmlldygpO1xuICB9XG5cbiAgLy8gUmVzdG9yZSBhbnkgcHJpb3IgaW5zdHJ1Y3Rpb25zIGZyb20gc2Vzc2lvblxuICByZXN0b3JlSW5zdHJ1Y3Rpb25IaXN0b3J5KCk7XG59XG5cbi8qKlxuICogU2V0IHVwIGV2ZW50IGxpc3RlbmVycyBmb3IgbGF5b3V0IGluc3RydWN0aW9uIFVJLlxuICovXG5mdW5jdGlvbiBzZXR1cExheW91dEluc3RydWN0aW9uTGlzdGVuZXJzKCkge1xuICBjb25zdCBhcHBseUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHBseS1pbnN0cnVjdGlvbi1idG4nKTtcbiAgY29uc3QgcHJvY2VlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkLXRvLWZpbmFsaXNlLWJ0bicpO1xuICBjb25zdCBpbnN0cnVjdGlvbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luc3RydWN0aW9uLWlucHV0Jyk7XG4gIGNvbnN0IGhpc3RvcnlUb2dnbGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaGlzdG9yeS10b2dnbGUnKTtcblxuICBpZiAoYXBwbHlCdG4pIHtcbiAgICBhcHBseUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGNvbnN0IGluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb25JbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICBpZiAoIWluc3RydWN0aW9uKSB7XG4gICAgICAgIGFwcGVuZE1lc3NhZ2UoJ3N5c3RlbScsICdcdTI2QTBcdUZFMEYgUGxlYXNlIGVudGVyIGEgbGF5b3V0IGluc3RydWN0aW9uIGJlZm9yZSBzdWJtaXR0aW5nLicpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzdWJtaXRMYXlvdXRJbnN0cnVjdGlvbihpbnN0cnVjdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICBpZiAocHJvY2VlZEJ0bikge1xuICAgIHByb2NlZWRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjb21wbGV0ZUxheW91dFJldmlldyk7XG4gIH1cblxuICBpZiAoaGlzdG9yeVRvZ2dsZSkge1xuICAgIGhpc3RvcnlUb2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgZS50YXJnZXQudGV4dENvbnRlbnQgPSBlLnRhcmdldC50ZXh0Q29udGVudCA9PT0gJ1x1MjVCQycgPyAnXHUyNUI2JyA6ICdcdTI1QkMnO1xuICAgICAgY29uc3QgaGlzdG9yeUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5zdHJ1Y3Rpb24taGlzdG9yeScpO1xuICAgICAgaWYgKGhpc3RvcnlMaXN0KSB7XG4gICAgICAgIGhpc3RvcnlMaXN0LmNsYXNzTGlzdC50b2dnbGUoJ2NvbGxhcHNlZCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWxsb3cgRW50ZXIga2V5IHRvIHN1Ym1pdCBpbiB0ZXh0YXJlYSAoU2hpZnQrRW50ZXIgZm9yIG5ldyBsaW5lKVxuICBpZiAoaW5zdHJ1Y3Rpb25JbnB1dCkge1xuICAgIGluc3RydWN0aW9uSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmICFlLnNoaWZ0S2V5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgYXBwbHlCdG4/LmNsaWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBTdWJtaXQgbGF5b3V0IGluc3RydWN0aW9uIHRvIGJhY2tlbmQgZm9yIHByb2Nlc3NpbmcuXG4gKlxuICogVXNlcyBQT1NUIC9hcGkvY3YvbGF5b3V0LXJlZmluZSAoc3RhZ2VkIGdlbmVyYXRpb24gY29udHJhY3QpIHdoZW4gYVxuICogc2Vzc2lvbi1zdG9yZWQgcHJldmlldyBpcyBhdmFpbGFibGUuICBGYWxscyBiYWNrIHRvIHRoZSBsZWdhY3lcbiAqIFBPU1QgL2FwaS9sYXlvdXQtaW5zdHJ1Y3Rpb24gZW5kcG9pbnQgKHdoaWNoIHJlcXVpcmVzIHRoZSBIVE1MIGluIHRoZVxuICogcmVxdWVzdCBib2R5KSB3aGVuIG5vIHNlc3Npb24gcHJldmlldyBleGlzdHMuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN1Ym1pdExheW91dEluc3RydWN0aW9uKGluc3RydWN0aW9uVGV4dCkge1xuICBjb25zdCBjdXJyZW50SHRtbCA9IHdpbmRvdy50YWJEYXRhPy5jdj8uWycqLmh0bWwnXSB8fCAnJztcbiAgY29uc3QgcHJpb3JJbnN0cnVjdGlvbnMgPSB3aW5kb3cubGF5b3V0SW5zdHJ1Y3Rpb25zIHx8IFtdO1xuXG4gIHRyeSB7XG4gICAgc2hvd1Byb2Nlc3NpbmcodHJ1ZSk7XG5cbiAgICAvLyBQcmVmZXIgdGhlIHNlc3Npb24tYmFja2VkIGVuZHBvaW50OyBpdCBtYW5hZ2VzIEhUTUwgc2VydmVyLXNpZGUuXG4gICAgbGV0IHJlc3BvbnNlO1xuICAgIGNvbnN0IGdlblN0YXRlID0gc3RhdGVNYW5hZ2VyPy5nZXRHZW5lcmF0aW9uU3RhdGU/LigpIHx8IHt9O1xuICAgIGNvbnN0IHVzZVNlc3Npb25FbmRwb2ludCA9IGdlblN0YXRlLnByZXZpZXdBdmFpbGFibGUgfHwgZ2VuU3RhdGUucGhhc2UgPT09ICdsYXlvdXRfcmV2aWV3JztcblxuICAgIGlmICh1c2VTZXNzaW9uRW5kcG9pbnQpIHtcbiAgICAgIHJlc3BvbnNlID0gYXdhaXQgYXBpQ2FsbCgnUE9TVCcsICcvYXBpL2N2L2xheW91dC1yZWZpbmUnLCB7XG4gICAgICAgIGluc3RydWN0aW9uOiBpbnN0cnVjdGlvblRleHQsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzcG9uc2UgPSBhd2FpdCBhcGlDYWxsKCdQT1NUJywgJy9hcGkvbGF5b3V0LWluc3RydWN0aW9uJywge1xuICAgICAgICBpbnN0cnVjdGlvbjogaW5zdHJ1Y3Rpb25UZXh0LFxuICAgICAgICBjdXJyZW50X2h0bWw6IGN1cnJlbnRIdG1sLFxuICAgICAgICBwcmlvcl9pbnN0cnVjdGlvbnM6IHByaW9ySW5zdHJ1Y3Rpb25zLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgaWYgKHJlc3BvbnNlLmVycm9yID09PSAnY2xhcmlmeScpIHtcbiAgICAgICAgc2hvd0NsYXJpZmljYXRpb25EaWFsb2cocmVzcG9uc2UucXVlc3Rpb24sIGluc3RydWN0aW9uVGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgZXJyb3JIdG1sID0gYFx1MjZBMFx1RkUwRiBFcnJvcjogJHtodG1sRXNjYXBlKHJlc3BvbnNlLmVycm9yKX0gXHUyMDE0ICR7aHRtbEVzY2FwZShyZXNwb25zZS5kZXRhaWxzIHx8ICcnKX1gO1xuICAgICAgICBpZiAocmVzcG9uc2UucmF3X3Jlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlcnJvckh0bWwgKz0gYDxicj48ZGV0YWlscyBzdHlsZT1cIm1hcmdpbi10b3A6NnB4XCI+PHN1bW1hcnkgc3R5bGU9XCJjdXJzb3I6cG9pbnRlcjtmb250LXNpemU6MC44NWVtO2NvbG9yOiM2NDc0OGJcIj5SYXcgTExNIHJlc3BvbnNlPC9zdW1tYXJ5PjxwcmUgc3R5bGU9XCJmb250LXNpemU6MC43NWVtO3doaXRlLXNwYWNlOnByZS13cmFwO3dvcmQtYnJlYWs6YnJlYWstYWxsO21heC1oZWlnaHQ6MjAwcHg7b3ZlcmZsb3cteTphdXRvO2JhY2tncm91bmQ6I2Y4ZmFmYztib3JkZXI6MXB4IHNvbGlkICNlMmU4ZjA7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo4cHg7bWFyZ2luLXRvcDo0cHhcIj4ke2h0bWxFc2NhcGUocmVzcG9uc2UucmF3X3Jlc3BvbnNlIHx8ICcoZW1wdHkpJyl9PC9wcmU+PC9kZXRhaWxzPmA7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kTWVzc2FnZUh0bWwoJ3N5c3RlbScsIGVycm9ySHRtbCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHByZXZpZXcgd2l0aCBuZXcgSFRNTFxuICAgIGNvbnN0IG5ld0h0bWwgPSByZXNwb25zZS5odG1sO1xuICAgIGRpc3BsYXlMYXlvdXRQcmV2aWV3KG5ld0h0bWwpO1xuXG4gICAgLy8gVXBkYXRlIHN0YXRlXG4gICAgd2luZG93LnRhYkRhdGEuY3ZbJyouaHRtbCddID0gbmV3SHRtbDtcblxuICAgIC8vIEFkZCB0byBpbnN0cnVjdGlvbiBoaXN0b3J5XG4gICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCksXG4gICAgICBpbnN0cnVjdGlvbl90ZXh0OiBpbnN0cnVjdGlvblRleHQsXG4gICAgICBjaGFuZ2Vfc3VtbWFyeTogcmVzcG9uc2Uuc3VtbWFyeSxcbiAgICAgIGNvbmZpcm1hdGlvbjogdHJ1ZVxuICAgIH07XG4gICAgYWRkVG9JbnN0cnVjdGlvbkhpc3RvcnkoaW5zdHJ1Y3Rpb24pO1xuXG4gICAgLy8gU2hvdyBjb25maXJtYXRpb25cbiAgICBzaG93Q29uZmlybWF0aW9uTWVzc2FnZShgXHUyNzA1ICR7cmVzcG9uc2Uuc3VtbWFyeX1gKTtcblxuICAgIC8vIENsZWFyIGlucHV0IGFuZCBzaG93IHByb2NlZWQgYnV0dG9uXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luc3RydWN0aW9uLWlucHV0JykudmFsdWUgPSAnJztcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZC10by1maW5hbGlzZS1idG4nKS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGFwcGVuZE1lc3NhZ2UoJ3N5c3RlbScsIGBcdTI3NEMgRmFpbGVkIHRvIGFwcGx5IGxheW91dCBpbnN0cnVjdGlvbjogJHtlcnJvci5tZXNzYWdlfWApO1xuICB9IGZpbmFsbHkge1xuICAgIHNob3dQcm9jZXNzaW5nKGZhbHNlKTtcbiAgfVxufVxuXG4vKipcbiAqIEZldGNoIHRoZSBDViBIVE1MIHByZXZpZXcgdmlhIHRoZSBzdGFnZWQgZ2VuZXJhdGlvbiBjb250cmFjdC5cbiAqXG4gKiBGaXJzdCB0cmllcyBQT1NUIC9hcGkvY3YvZ2VuZXJhdGUtcHJldmlldyAocmVuZGVycyBmcmVzaCBIVE1MIGZyb20gY3VycmVudFxuICogc2Vzc2lvbiBzdGF0ZSBhbmQgc3RvcmVzIGl0KS4gIEZhbGxzIGJhY2sgdG8gR0VUIC9hcGkvbGF5b3V0LWh0bWwgKGxlZ2FjeVxuICogZW5kcG9pbnQgdGhhdCByZWFkcyB0aGUgbW9zdCByZWNlbnQgSFRNTCBmaWxlIGZyb20gZGlzaykgd2hlbiB0aGUgc2Vzc2lvblxuICogZG9lcyBub3QgeWV0IGhhdmUgY3VzdG9taXphdGlvbiBkYXRhLlxuICovXG5hc3luYyBmdW5jdGlvbiBfZmV0Y2hBbmREaXNwbGF5TGF5b3V0UHJldmlldygpIHtcbiAgLy8gVHJ5IHN0YWdlZCBnZW5lcmF0aW9uIGVuZHBvaW50IGZpcnN0XG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9jdi9nZW5lcmF0ZS1wcmV2aWV3Jywge30pO1xuICAgIGlmIChkYXRhLm9rICYmIGRhdGEuaHRtbCkge1xuICAgICAgZGlzcGxheUxheW91dFByZXZpZXcoZGF0YS5odG1sKTtcbiAgICAgIGlmICghd2luZG93LnRhYkRhdGEpIHdpbmRvdy50YWJEYXRhID0ge307XG4gICAgICBpZiAoIXdpbmRvdy50YWJEYXRhLmN2IHx8IHR5cGVvZiB3aW5kb3cudGFiRGF0YS5jdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgd2luZG93LnRhYkRhdGEuY3YgPSB7fTtcbiAgICAgIH1cbiAgICAgIHdpbmRvdy50YWJEYXRhLmN2WycqLmh0bWwnXSA9IGRhdGEuaHRtbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0gY2F0Y2ggKF9lKSB7XG4gICAgLy8gZmFsbCB0aHJvdWdoIHRvIGxlZ2FjeSBlbmRwb2ludFxuICB9XG5cbiAgLy8gTGVnYWN5IGZhbGxiYWNrOiBsb2FkIEhUTUwgZnJvbSB0aGUgb3V0cHV0IGRpcmVjdG9yeSBvbiBkaXNrXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGFwaUNhbGwoJ0dFVCcsICcvYXBpL2xheW91dC1odG1sJyk7XG4gICAgaWYgKGRhdGEub2sgJiYgZGF0YS5odG1sKSB7XG4gICAgICBkaXNwbGF5TGF5b3V0UHJldmlldyhkYXRhLmh0bWwpO1xuICAgICAgaWYgKCF3aW5kb3cudGFiRGF0YSkgd2luZG93LnRhYkRhdGEgPSB7fTtcbiAgICAgIGlmICghd2luZG93LnRhYkRhdGEuY3YgfHwgdHlwZW9mIHdpbmRvdy50YWJEYXRhLmN2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB3aW5kb3cudGFiRGF0YS5jdiA9IHt9O1xuICAgICAgfVxuICAgICAgd2luZG93LnRhYkRhdGEuY3ZbJyouaHRtbCddID0gZGF0YS5odG1sO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0xheW91dCBwcmV2aWV3IG5vdCBhdmFpbGFibGU6JywgZGF0YS5lcnJvciB8fCAnbm8gSFRNTCByZXR1cm5lZCcpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdDb3VsZCBub3QgbG9hZCBsYXlvdXQgcHJldmlldzonLCBlcnIpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGxheSBIVE1MIHByZXZpZXcgaW4gaWZyYW1lLlxuICovXG5mdW5jdGlvbiBkaXNwbGF5TGF5b3V0UHJldmlldyhodG1sKSB7XG4gIGNvbnN0IHByZXZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGF5b3V0LXByZXZpZXcnKTtcbiAgaWYgKCFwcmV2aWV3KSByZXR1cm47XG5cbiAgcHJldmlldy5vbmxvYWQgPSAoKSA9PiBmaXRMYXlvdXRQcmV2aWV3VG9QYW5lKHByZXZpZXcpO1xuXG4gIC8vIFNldCBpZnJhbWUgY29udGVudCBzYWZlbHlcbiAgY29uc3QgZG9jID0gcHJldmlldy5jb250ZW50RG9jdW1lbnQgfHwgcHJldmlldy5jb250ZW50V2luZG93Py5kb2N1bWVudDtcbiAgaWYgKGRvYykge1xuICAgIGRvYy5vcGVuKCk7XG4gICAgZG9jLndyaXRlKGh0bWwpO1xuICAgIGRvYy5jbG9zZSgpO1xuICAgIGZpdExheW91dFByZXZpZXdUb1BhbmUocHJldmlldyk7XG4gIH1cbn1cblxuLyoqXG4gKiBTY2FsZSB0aGUgcHJldmlldyBzbyBhbiBlbnRpcmUgQ1YgcGFnZSB3aWR0aCBmaXRzIHdpdGhpbiB0aGUgcHJldmlldyBwYW5lLlxuICovXG5mdW5jdGlvbiBmaXRMYXlvdXRQcmV2aWV3VG9QYW5lKHByZXZpZXcpIHtcbiAgY29uc3QgZG9jID0gcHJldmlldz8uY29udGVudERvY3VtZW50IHx8IHByZXZpZXc/LmNvbnRlbnRXaW5kb3c/LmRvY3VtZW50O1xuICBjb25zdCBjb250YWluZXIgPSBwcmV2aWV3Py5jbG9zZXN0KCcucHJldmlldy1pZnJhbWUtY29udGFpbmVyJyk7XG4gIGlmICghZG9jIHx8ICFjb250YWluZXIpIHJldHVybjtcblxuICBjb25zdCBwYWdlQ29udGFpbmVyID0gZG9jLnF1ZXJ5U2VsZWN0b3IoJy5wYWdlLWNvbnRhaW5lcicpIHx8IGRvYy5ib2R5O1xuICBpZiAoIXBhZ2VDb250YWluZXIpIHJldHVybjtcblxuICBjb25zdCBjb250YWluZXJXaWR0aCA9IE1hdGgubWF4KGNvbnRhaW5lci5jbGllbnRXaWR0aCAtIDI0LCAxKTtcbiAgY29uc3QgY29udGVudFdpZHRoID0gTWF0aC5tYXgoXG4gICAgTWF0aC5jZWlsKHBhZ2VDb250YWluZXIuc2Nyb2xsV2lkdGggfHwgMCksXG4gICAgTWF0aC5jZWlsKHBhZ2VDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggfHwgMCksXG4gICAgMVxuICApO1xuICBjb25zdCBzY2FsZSA9IE1hdGgubWluKDEsIGNvbnRhaW5lcldpZHRoIC8gY29udGVudFdpZHRoKTtcblxuICBkb2MuZG9jdW1lbnRFbGVtZW50LnN0eWxlLmJhY2tncm91bmQgPSAnI2Y4ZmFmYyc7XG4gIGRvYy5ib2R5LnN0eWxlLm1hcmdpbiA9ICcwJztcbiAgZG9jLmJvZHkuc3R5bGUucGFkZGluZyA9ICcwJztcbiAgZG9jLmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICcjZjhmYWZjJztcbiAgZG9jLmJvZHkuc3R5bGUub3ZlcmZsb3dYID0gJ2F1dG8nO1xuXG4gIHBhZ2VDb250YWluZXIuc3R5bGUuem9vbSA9IGAke3NjYWxlfWA7XG4gIHBhZ2VDb250YWluZXIuc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gIHBhZ2VDb250YWluZXIuc3R5bGUudHJhbnNmb3JtT3JpZ2luID0gJyc7XG4gIHBhZ2VDb250YWluZXIuc3R5bGUubWFyZ2luID0gJzEycHgnO1xuICBwcmV2aWV3LnN0eWxlLm1pbldpZHRoID0gJyc7XG59XG5cbi8qKlxuICogQWRkIGluc3RydWN0aW9uIHRvIGhpc3RvcnkgcGFuZWwuXG4gKi9cbmZ1bmN0aW9uIGFkZFRvSW5zdHJ1Y3Rpb25IaXN0b3J5KGluc3RydWN0aW9uKSB7XG4gIC8vIEluaXRpYWxpemUgZ2xvYmFsIGluc3RydWN0aW9uIGxpc3QgaWYgbmVlZGVkXG4gIGlmICghd2luZG93LmxheW91dEluc3RydWN0aW9ucykge1xuICAgIHdpbmRvdy5sYXlvdXRJbnN0cnVjdGlvbnMgPSBbXTtcbiAgfVxuXG4gIHdpbmRvdy5sYXlvdXRJbnN0cnVjdGlvbnMucHVzaChpbnN0cnVjdGlvbik7XG4gIHJlbmRlckluc3RydWN0aW9uSGlzdG9yeSgpO1xufVxuXG4vKipcbiAqIFJlbmRlciBpbnN0cnVjdGlvbiBoaXN0b3J5IGZyb20gY3VycmVudCBzdGF0ZSB3aXRob3V0IG11dGF0aW5nIGl0LlxuICovXG5mdW5jdGlvbiByZW5kZXJJbnN0cnVjdGlvbkhpc3RvcnkoKSB7XG4gIGNvbnN0IGhpc3RvcnlMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luc3RydWN0aW9uLWhpc3RvcnknKTtcbiAgaWYgKCFoaXN0b3J5TGlzdCkgcmV0dXJuO1xuXG4gIGhpc3RvcnlMaXN0LmlubmVySFRNTCA9ICcnO1xuICAod2luZG93LmxheW91dEluc3RydWN0aW9ucyB8fCBbXSkuZm9yRWFjaCgoaW5zdHJ1Y3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbnRyeS5jbGFzc05hbWUgPSAnaW5zdHJ1Y3Rpb24taGlzdG9yeS1lbnRyeSc7XG4gICAgZW50cnkuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImluc3RydWN0aW9uLXRpbWVcIj4ke2luc3RydWN0aW9uLnRpbWVzdGFtcCB8fCAnJ308L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJpbnN0cnVjdGlvbi10ZXh0XCI+JHtodG1sRXNjYXBlKGluc3RydWN0aW9uLmluc3RydWN0aW9uX3RleHQgfHwgJycpfTwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImluc3RydWN0aW9uLXN1bW1hcnlcIj48ZW0+JHtodG1sRXNjYXBlKGluc3RydWN0aW9uLmNoYW5nZV9zdW1tYXJ5IHx8ICcnKX08L2VtPjwvZGl2PlxuICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc21hbGxcIiBvbmNsaWNrPVwidW5kb0luc3RydWN0aW9uKCR7aW5kZXh9KVwiPlxuICAgICAgICBVbmRvXG4gICAgICA8L2J1dHRvbj5cbiAgICBgO1xuXG4gICAgaGlzdG9yeUxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xuICB9KTtcblxuICAvLyBVcGRhdGUgY291bnRcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luc3RydWN0aW9uLWNvdW50JykudGV4dENvbnRlbnQgPSAod2luZG93LmxheW91dEluc3RydWN0aW9ucyB8fCBbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIFJlc3RvcmUgaW5zdHJ1Y3Rpb24gaGlzdG9yeSBmcm9tIHNlc3Npb24gc3RhdGUuXG4gKi9cbmZ1bmN0aW9uIHJlc3RvcmVJbnN0cnVjdGlvbkhpc3RvcnkoKSB7XG4gIHJlbmRlckluc3RydWN0aW9uSGlzdG9yeSgpO1xuXG4gIC8vIFNob3cgcHJvY2VlZCBidXR0b24gaWYgYW55IGluc3RydWN0aW9ucyBhcHBsaWVkXG4gIGNvbnN0IGluc3RydWN0aW9ucyA9IHdpbmRvdy5sYXlvdXRJbnN0cnVjdGlvbnMgfHwgW107XG4gIGlmIChpbnN0cnVjdGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkLXRvLWZpbmFsaXNlLWJ0bicpLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICB9XG59XG5cbi8qKlxuICogU2hvdyBwcm9jZXNzaW5nIHNwaW5uZXIuXG4gKi9cbmZ1bmN0aW9uIHNob3dQcm9jZXNzaW5nKHNob3cpIHtcbiAgY29uc3QgaW5kaWNhdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Byb2Nlc3NpbmctaW5kaWNhdG9yJyk7XG4gIGlmIChpbmRpY2F0b3IpIHtcbiAgICBpbmRpY2F0b3Iuc3R5bGUuZGlzcGxheSA9IHNob3cgPyAnYmxvY2snIDogJ25vbmUnO1xuICB9XG59XG5cbi8qKlxuICogU2hvdyBjb25maXJtYXRpb24gbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gc2hvd0NvbmZpcm1hdGlvbk1lc3NhZ2UobWVzc2FnZSkge1xuICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm1hdGlvbi1tZXNzYWdlJyk7XG4gIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gIGVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuICBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gIC8vIEF1dG8taGlkZSBhZnRlciAzIHNlY29uZHNcbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9LCAzMDAwKTtcbn1cblxuLyoqXG4gKiBTaG93IGlubGluZSBjbGFyaWZpY2F0aW9uIGRpYWxvZyB3aGVuIExMTSBuZWVkcyBtb3JlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHNob3dDbGFyaWZpY2F0aW9uRGlhbG9nKHF1ZXN0aW9uLCBvcmlnaW5hbEluc3RydWN0aW9uKSB7XG4gIGNvbnN0IHJlc3BvbnNlID0gcHJvbXB0KFxuICAgIGBUaGUgc3lzdGVtIG5lZWRzIGNsYXJpZmljYXRpb246XFxuXFxuJHtxdWVzdGlvbn1cXG5cXG5Zb3VyIG9yaWdpbmFsOiBcIiR7b3JpZ2luYWxJbnN0cnVjdGlvbn1cIlxcblxcblBsZWFzZSBjbGFyaWZ5OmAsXG4gICAgb3JpZ2luYWxJbnN0cnVjdGlvblxuICApO1xuXG4gIGlmIChyZXNwb25zZSAmJiByZXNwb25zZSAhPT0gb3JpZ2luYWxJbnN0cnVjdGlvbikge1xuICAgIHN1Ym1pdExheW91dEluc3RydWN0aW9uKHJlc3BvbnNlKTtcbiAgfVxufVxuXG4vKipcbiAqIFVuZG8gYSBzcGVjaWZpYyBpbnN0cnVjdGlvbiAocmVnZW5lcmF0ZSBmcm9tIHByaW9yIHN0ZXApLlxuICovXG5mdW5jdGlvbiB1bmRvSW5zdHJ1Y3Rpb24oaW5kZXgpIHtcbiAgaWYgKCF3aW5kb3cubGF5b3V0SW5zdHJ1Y3Rpb25zIHx8IGluZGV4IDwgMCB8fCBpbmRleCA+PSB3aW5kb3cubGF5b3V0SW5zdHJ1Y3Rpb25zLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHdpbmRvdy5sYXlvdXRJbnN0cnVjdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcblxuICAvLyBSZWdlbmVyYXRlIHByZXZpZXcgZnJvbSBIVE1MIGF0IHRoaXMgcG9pbnRcbiAgLy8gKHNpbXBsaWZpZWQ6IGluIHByb2R1Y3Rpb24sIHdvdWxkIHJlLWFwcGx5IGFsbCBwcmlvciBpbnN0cnVjdGlvbnMpXG4gIGFwcGVuZE1lc3NhZ2UoJ3N5c3RlbScsICdcdUQ4M0RcdUREMDQgVW5kbyBub3QgeWV0IGltcGxlbWVudGVkIFx1MjAxNCB3b3VsZCByZWdlbmVyYXRlIGZyb20gcHJpb3Igc3RhdGUnKTtcblxuICAvLyBVcGRhdGUgaGlzdG9yeSBkaXNwbGF5XG4gIGNvbnN0IGhpc3RvcnlMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luc3RydWN0aW9uLWhpc3RvcnknKTtcbiAgaWYgKGhpc3RvcnlMaXN0KSB7XG4gICAgcmVuZGVySW5zdHJ1Y3Rpb25IaXN0b3J5KCk7XG4gIH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcbiAgY29uc3QgcHJldmlldyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXlvdXQtcHJldmlldycpO1xuICBpZiAocHJldmlldykge1xuICAgIGZpdExheW91dFByZXZpZXdUb1BhbmUocHJldmlldyk7XG4gIH1cbn0pO1xuXG4vKipcbiAqIENvbXBsZXRlIGxheW91dCByZXZpZXc6IGNvbmZpcm0gbGF5b3V0IHZpYSBzdGFnZWQgZ2VuZXJhdGlvbiBjb250cmFjdCxcbiAqIHRyaWdnZXIgZmluYWwgUERGL0RPQ1ggZ2VuZXJhdGlvbiBmcm9tIHRoZSBjb25maXJtZWQgSFRNTCwgdGhlbiBhZHZhbmNlXG4gKiB0aGUgY29udmVyc2F0aW9uIHBoYXNlIHZpYSB0aGUgbGVnYWN5IC9hcGkvbGF5b3V0LWNvbXBsZXRlIGVuZHBvaW50LlxuICovXG5hc3luYyBmdW5jdGlvbiBjb21wbGV0ZUxheW91dFJldmlldygpIHtcbiAgdHJ5IHtcbiAgICBzaG93UHJvY2Vzc2luZyh0cnVlKTtcblxuICAgIC8vIENvbmZpcm0gbGF5b3V0IGFuZCBnZW5lcmF0ZSBmaW5hbCBvdXRwdXRzIHdoZW4gc3RhZ2VkIGZsb3cgaXMgYWN0aXZlIChHQVAtMjApLlxuICAgIGNvbnN0IGdlblN0YXRlID0gc3RhdGVNYW5hZ2VyPy5nZXRHZW5lcmF0aW9uU3RhdGU/LigpIHx8IHt9O1xuICAgIGlmIChnZW5TdGF0ZS5wcmV2aWV3QXZhaWxhYmxlIHx8IGdlblN0YXRlLnBoYXNlID09PSAnbGF5b3V0X3JldmlldycpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9jdi9jb25maXJtLWxheW91dCcsIHt9KTtcbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIC8vIG5vbi1mYXRhbDogY29udGludWUgdG8gZmluYWwgZ2VuZXJhdGlvbiBhdHRlbXB0XG4gICAgICB9XG5cbiAgICAgIC8vIFByb2R1Y2UgZmluYWwgUERGL0RPQ1ggZnJvbSB0aGUgY29uZmlybWVkIEhUTUwuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaW5hbFJlcyA9IGF3YWl0IGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9jdi9nZW5lcmF0ZS1maW5hbCcsIHt9KTtcbiAgICAgICAgaWYgKGZpbmFsUmVzICYmIGZpbmFsUmVzLm9rICYmIGZpbmFsUmVzLm91dHB1dHMpIHtcbiAgICAgICAgICBpZiAoIXdpbmRvdy50YWJEYXRhKSB3aW5kb3cudGFiRGF0YSA9IHt9O1xuICAgICAgICAgIHdpbmRvdy50YWJEYXRhLmN2ID0gZmluYWxSZXMub3V0cHV0cztcbiAgICAgICAgICBzdGF0ZU1hbmFnZXI/LnNldEdlbmVyYXRpb25TdGF0ZT8uKHsgcGhhc2U6ICdmaW5hbF9jb21wbGV0ZScgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIC8vIG5vbi1mYXRhbDogbGVnYWN5IG91dHB1dHMgcmVtYWluIGF2YWlsYWJsZSBmb3IgZG93bmxvYWRcbiAgICAgIH1cblxuICAgICAgLy8gUmVmcmVzaCBBVFMgYmFkZ2UgYWZ0ZXIgZmluYWwgZ2VuZXJhdGlvbiAoR0FQLTIxKS5cbiAgICAgIGlmICh0eXBlb2Ygc2NoZWR1bGVBdHNSZWZyZXNoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNjaGVkdWxlQXRzUmVmcmVzaCgncG9zdF9nZW5lcmF0aW9uJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBhcGlDYWxsKCdQT1NUJywgJy9hcGkvbGF5b3V0LWNvbXBsZXRlJywge1xuICAgICAgbGF5b3V0X2luc3RydWN0aW9uczogd2luZG93LmxheW91dEluc3RydWN0aW9ucyB8fCBbXVxuICAgIH0pO1xuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgYXBwZW5kTWVzc2FnZSgnc3lzdGVtJywgYFx1Mjc0QyBFcnJvcjogJHtyZXNwb25zZS5lcnJvcn1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhcHBlbmRNZXNzYWdlKCdhc3Npc3RhbnQnLCAnXHUyNzA1IExheW91dCBjb25maXJtZWQgYW5kIGZpbmFsIG91dHB1dCBnZW5lcmF0ZWQuJyk7XG5cbiAgICAvLyBVcGRhdGUgcGhhc2UgYW5kIHN3aXRjaCB0byBkb3dubG9hZC9nZW5lcmF0aW9uIHRhYlxuICAgIHN0YXRlTWFuYWdlci5zZXRQaGFzZSgncmVmaW5lbWVudCcpO1xuICAgIHN3aXRjaFRhYignZG93bmxvYWQnKTtcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGFwcGVuZE1lc3NhZ2UoJ3N5c3RlbScsIGBcdTI3NEMgRmFpbGVkIHRvIGNvbXBsZXRlIGxheW91dCByZXZpZXc6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBzaG93UHJvY2Vzc2luZyhmYWxzZSk7XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwIEVTIG1vZHVsZSBleHBvcnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHsgaW5pdGlhdGVMYXlvdXRJbnN0cnVjdGlvbnMsIGNvbXBsZXRlTGF5b3V0UmV2aWV3IH07XG4iLCAiLyoqXG4gKiB3ZWIvc3JjL21haW4uanMgXHUyMDE0IGVzYnVpbGQgZW50cnkgcG9pbnQgZm9yIHRoZSBmdWxsIGJyb3dzZXIgYnVuZGxlLlxuICpcbiAqIFBoYXNlIDI6IGJ1bmRsZXMgdXRpbHMsIGFwaS1jbGllbnQsIHN0YXRlLW1hbmFnZXIsIHVpLWNvcmUsIGFuZFxuICogbGF5b3V0LWluc3RydWN0aW9uIGludG8gYSBzaW5nbGUgSUlGRSAod2ViL2J1bmRsZS5qcykuIEV2ZXJ5IGV4cG9ydCBpc1xuICogYXNzaWduZWQgdG8gYHdpbmRvd2Agc28gdGhhdCBhcHAuanMgKHN0aWxsIGEgcGxhaW4gbGVnYWN5IHNjcmlwdCBsb2FkZWRcbiAqIGFmdGVyIHRoZSBidW5kbGUpIGNhbiBjYWxsIGFsbCBoZWxwZXJzIGFzIGJhcmUgZ2xvYmFsIGlkZW50aWZpZXJzLlxuICpcbiAqIEJ1aWxkOiAgbnBtIHJ1biBidWlsZCAgICAgICAgICBcdTIxOTIgd2ViL2J1bmRsZS5qcyAoZGV2ZWxvcG1lbnQsIHVubWluaWZpZWQpXG4gKiAgICAgICAgIG5wbSBydW4gYnVpbGQ6cHJvZCAgICAgXHUyMTkyIHdlYi9idW5kbGUuanMgKG1pbmlmaWVkKVxuICogICAgICAgICBucG0gcnVuIGJ1aWxkOndhdGNoICAgIFx1MjE5MiByZWJ1aWxkIG9uIGV2ZXJ5IHNvdXJjZSBjaGFuZ2VcbiAqXG4gKiBQaGFzZSAzIChmdXR1cmUpOiBjb252ZXJ0IGFwcC5qcyB0byBhbiBFUyBtb2R1bGUsIGltcG9ydCBpdCBoZXJlLCBhbmRcbiAqIGNvbGxhcHNlIGFsbCByZW1haW5pbmcgPHNjcmlwdD4gdGFncyBpbnRvIHRoaXMgc2luZ2xlIGJ1bmRsZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBVdGlscyAgICAgICAgICAgICBmcm9tICcuLi91dGlscy5qcyc7XG5pbXBvcnQgKiBhcyBBcGlDbGllbnQgICAgICAgICBmcm9tICcuLi9hcGktY2xpZW50LmpzJztcbmltcG9ydCAqIGFzIFN0YXRlICAgICAgICAgICAgIGZyb20gJy4uL3N0YXRlLW1hbmFnZXIuanMnO1xuaW1wb3J0ICogYXMgVWlDb3JlICAgICAgICAgICAgZnJvbSAnLi4vdWktY29yZS5qcyc7XG5pbXBvcnQgKiBhcyBMYXlvdXRJbnN0cnVjdGlvbiBmcm9tICcuLi9sYXlvdXQtaW5zdHJ1Y3Rpb24uanMnO1xuXG4vLyBFeHBvc2UgZXZlcnkgZXhwb3J0IHRvIHRoZSBnbG9iYWwgc2NvcGUgc28gYXBwLmpzIChsb2FkZWQgYXMgYSBwbGFpblxuLy8gPHNjcmlwdD4gdGFnIGFmdGVyIHRoaXMgYnVuZGxlKSBjYW4gY2FsbCBlLmcuIGNvbmZpcm1EaWFsb2coKSxcbi8vIGluaXRpYXRlTGF5b3V0SW5zdHJ1Y3Rpb25zKCksIFBIQVNFUy5JTklULCBzdGF0ZU1hbmFnZXIsIGV0Yy5cbk9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgVXRpbHMsIEFwaUNsaWVudCwgU3RhdGUsIFVpQ29yZSwgTGF5b3V0SW5zdHJ1Y3Rpb24pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVdBLFdBQVMsY0FBYyxNQUFNO0FBQzNCLFdBQU8sS0FDSixLQUFLLEVBQ0wsUUFBUSxRQUFRLEdBQUcsRUFDbkIsS0FBSztBQUFBLEVBQ1Y7QUFNQSxXQUFTLFFBQVEsSUFBSTtBQUNuQixVQUFNLE9BQU8sSUFBSSxL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QzFCLEdBQUcsR0FBSTtBQUFBLEVBQ1Q7QUFLQSxXQUFTLHdCQUF3QixVQUFVLHFCQUFxQjtBQUM5RCxVQUFNLFdBQVc7QUFBQSxNQUNmO0FBQUE7QUFBQSxFQUFzQyxRQUFRO0FBQUE7QUFBQSxrQkFBdUIsbUJBQW1CO0FBQUE7QUFBQTtBQUFBLE1BQ3hGO0FBQUEsSUFDRjtBQUVBLFFBQUksWUFBWSxhQUFhLHFCQUFxQjtBQUNoRCw4QkFBd0IsUUFBUTtBQUFBLElBQ2xDO0FBQUEsRUFDRjtBQXVCQSxTQUFPLGlCQUFpQixVQUFVLE1BQU07QUFDdEMsVUFBTSxVQUFVLFNBQVMsZUFBZSxnQkFBZ0I7QUFDeEQsUUFBSSxTQUFTO0FBQ1gsNkJBQXVCLE9BQU87QUFBQSxJQUNoQztBQUFBLEVBQ0YsQ0FBQztBQU9ELGlCQUFlLHVCQUF1QjtBQUNwQyxRQUFJO0FBQ0YscUJBQWUsSUFBSTtBQUduQixZQUFNLFdBQVcsY0FBYyxxQkFBcUIsS0FBSyxDQUFDO0FBQzFELFVBQUksU0FBUyxvQkFBb0IsU0FBUyxVQUFVLGlCQUFpQjtBQUNuRSxZQUFJO0FBQ0YsZ0JBQU0sUUFBUSxRQUFRLDBCQUEwQixDQUFDLENBQUM7QUFBQSxRQUNwRCxTQUFTLElBQUk7QUFBQSxRQUViO0FBR0EsWUFBSTtBQUNGLGdCQUFNLFdBQVcsTUFBTSxRQUFRLFFBQVEsMEJBQTBCLENBQUMsQ0FBQztBQUNuRSxjQUFJLFlBQVksU0FBUyxNQUFNLFNBQVMsU0FBUztBQUMvQyxnQkFBSSxDQUFDLE9BQU8sUUFBUyxRQUFPLFVBQVUsQ0FBQztBQUN2QyxtQkFBTyxRQUFRLEtBQUssU0FBUztBQUM3QiwwQkFBYyxxQkFBcUIsRUFBRSxPQUFPLGlCQUFpQixDQUFDO0FBQUEsVUFDaEU7QUFBQSxRQUNGLFNBQVMsSUFBSTtBQUFBLFFBRWI7QUFHQSxZQUFJLE9BQU8sdUJBQXVCLFlBQVk7QUFDNUMsNkJBQW1CLGlCQUFpQjtBQUFBLFFBQ3RDO0FBQUEsTUFDRjtBQUVBLFlBQU0sV0FBVyxNQUFNLFFBQVEsUUFBUSx3QkFBd0I7QUFBQSxRQUM3RCxxQkFBcUIsT0FBTyxzQkFBc0IsQ0FBQztBQUFBLE1BQ3JELENBQUM7QUFFRCxVQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLHNCQUFjLFVBQVUsaUJBQVksU0FBUyxLQUFLLEVBQUU7QUFDcEQ7QUFBQSxNQUNGO0FBRUEsb0JBQWMsYUFBYSxxREFBZ0Q7QUFHM0UsbUJBQWEsU0FBUyxZQUFZO0FBQ2xDLGdCQUFVLFVBQVU7QUFBQSxJQUV0QixTQUFTLE9BQU87QUFDZCxvQkFBYyxVQUFVLDRDQUF1QyxNQUFNLE9BQU8sRUFBRTtBQUFBLElBQ2hGLFVBQUU7QUFDQSxxQkFBZSxLQUFLO0FBQUEsSUFDdEI7QUFBQSxFQUNGOzs7QUNqY0EsU0FBTyxPQUFPLFlBQVksZUFBTyxvQkFBVyx1QkFBTyxpQkFBUSwwQkFBaUI7IiwKICAibmFtZXMiOiBbInNlc3Npb25JZCIsICJpbml0IiwgImlzTG9hZGluZyIsICJ0YWJEYXRhIiwgInRhYkRhdGEiXQp9Cg==
