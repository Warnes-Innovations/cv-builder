/* cv-builder modules — built by esbuild, do not edit directly */
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
  function _buildSessionAwareRequest(input, init = {}) {
    if (typeof window === "undefined" || !window.location) {
      return [input, init];
    }
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/")) {
      return [input, init];
    }
    const ownerToken = getOwnerToken();
    if (!url.searchParams.has("owner_token") && !_isSessionManagementPath(url.pathname) && ownerToken) {
      url.searchParams.set("owner_token", ownerToken);
    }
    const sessionId2 = getSessionIdFromURL();
    if (!sessionId2) {
      return [url.toString(), init];
    }
    const method = (init.method || "GET").toUpperCase();
    const nextInit = { ...init };
    const headers = new Headers(init.headers || {});
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
  async function sessionAwareFetch(input, init = {}) {
    if (_nativeFetch == null) {
      throw new Error("fetch is not available");
    }
    const [nextInput, nextInit] = _buildSessionAwareRequest(input, init);
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
  var tabData = {
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
    getTabData: (tab) => tabData[tab],
    setTabData: (tab, data) => {
      tabData[tab] = data;
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
        tabData = { ...tabData, ...data.tabData };
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

  // web/src/main.js
  Object.assign(globalThis, utils_exports, api_client_exports, state_manager_exports);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidXRpbHMuanMiLCAiYXBpLWNsaWVudC5qcyIsICJzdGF0ZS1tYW5hZ2VyLmpzIiwgInNyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIHV0aWxzLmpzXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgdGV4dCBwcm9jZXNzaW5nLCBmb3JtYXR0aW5nLCBhbmQgZGF0YSBtYW5pcHVsYXRpb24uXG4gKiBObyBkZXBlbmRlbmNpZXMgb24gRE9NIG9yIGNvbXBsZXggc3RhdGUuIFB1cmUgZnVuY3Rpb25zLlxuICovXG5cbi8qKlxuICogTm9ybWFsaXplIHdoaXRlc3BhY2UgaW4gdGV4dDpcbiAqIC0gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuICogLSBDb2xsYXBzZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIHRvIHNpbmdsZSBzcGFjZXNcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplVGV4dCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0XG4gICAgLnRyaW0oKSAgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuICAgIC5yZXBsYWNlKC9cXHMrL2csICcgJykgIC8vIENvbGxhcHNlIGludGVybmFsIHdoaXRlc3BhY2VcbiAgICAudHJpbSgpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBhIFVuaXggdGltZXN0YW1wIGFzIGh1bWFuLXJlYWRhYmxlIGRhdGUgc3RyaW5nLlxuICogRXhhbXBsZTogMTcwOTIzNjgwMCBcdTIxOTIgXCJNYXIgMSwgMjAyNFwiXG4gKi9cbmZ1bmN0aW9uIGZtdERhdGUodHMpIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzICogMTAwMCk7XG4gIHJldHVybiBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygnZW4tVVMnLCB7IG1vbnRoOiAnc2hvcnQnLCBkYXk6ICdudW1lcmljJywgeWVhcjogJ251bWVyaWMnIH0pO1xufVxuXG4vKipcbiAqIENsZWFuIEpTT04gcmVzcG9uc2UgYnkgcmVtb3ZpbmcgbWFya2Rvd24gY29kZSBibG9ja3MuXG4gKiBIYW5kbGVzIGNvbW1vbiBwYXR0ZXJuczpcbiAqIC0gYGBganNvbiAuLi4gYGBgXG4gKiAtIGBgYFxuICogICAuLi5cbiAqIGBgYFxuICovXG5mdW5jdGlvbiBjbGVhbkpzb25SZXNwb25zZSh0ZXh0KSB7XG4gIGxldCBjbGVhbmVkID0gdGV4dDtcbiAgLy8gUmVtb3ZlIGBgYGpzb24gd3JhcHBlclxuICBjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9eYGBganNvblxccyovaSwgJycpLnJlcGxhY2UoL2BgYFxccyokL2ksICcnKTtcbiAgLy8gUmVtb3ZlIGBgYCB3cmFwcGVyXG4gIGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL15gYGBcXHMqL2ksICcnKS5yZXBsYWNlKC9gYGBcXHMqJC9pLCAnJyk7XG4gIHJldHVybiBjbGVhbmVkLnRyaW0oKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnMgdG8gcHJldmVudCBpbmplY3Rpb24uXG4gKiBDb252ZXJ0czogJiA8ID4gXCIgJ1xuICovXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQpIHtcbiAgY29uc3QgbWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMDM5OydcbiAgfTtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGl0bGUgYW5kIGNvbXBhbnkgZnJvbSBqb2IgZGVzY3JpcHRpb24gdGV4dC5cbiAqIFBhdHRlcm5zOlxuICogLSBcIlRpdGxlIHwgQ29tcGFueVwiXG4gKiAtIFwiVGl0bGUgYXQgQ29tcGFueVwiXG4gKiAtIEZpcnN0IGxpbmUgY29udGFpbmluZyBcInRpdGxlXCIsIFwicG9zaXRpb25cIiwgXCJyb2xlXCIsIFwiYXJjaGl0ZWN0XCIsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFRpdGxlQW5kQ29tcGFueUZyb21Kb2JUZXh0KGpvYlRleHQpIHtcbiAgY29uc3QgbGluZXMgPSBqb2JUZXh0LnNwbGl0KCdcXG4nKS5tYXAobCA9PiBsLnRyaW0oKSkuZmlsdGVyKGwgPT4gbC5sZW5ndGggPiAwKTtcblxuICAvLyBMb29rIGZvciBwYXR0ZXJuczogXCJUaXRsZSB8IENvbXBhbnlcIiBvciBcIlRpdGxlIGF0IENvbXBhbnlcIlxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBpZiAobGluZS5pbmNsdWRlcygnfCcpKSB7XG4gICAgICBjb25zdCBbdGl0bGUsIGNvbXBhbnldID0gbGluZS5zcGxpdCgnfCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICAgIGlmICh0aXRsZSAmJiBjb21wYW55KSB7XG4gICAgICAgIHJldHVybiB7IHRpdGxlLCBjb21wYW55IH07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJyBhdCAnKSkge1xuICAgICAgY29uc3QgW3RpdGxlLCBjb21wYW55XSA9IGxpbmUuc3BsaXQoL1xccythdFxccysvaSkubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgaWYgKHRpdGxlICYmIGNvbXBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHsgdGl0bGUsIGNvbXBhbnkgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBGYWxsYmFjazogdXNlIGZpcnN0IG5vbi1lbXB0eSBsaW5lIGFzIHRpdGxlXG4gIGNvbnN0IHRpdGxlTGluZSA9IGxpbmVzWzBdO1xuICByZXR1cm4ge1xuICAgIHRpdGxlOiB0aXRsZUxpbmUgfHwgJ1VudGl0bGVkIFBvc2l0aW9uJyxcbiAgICBjb21wYW55OiBsaW5lcy5maW5kKGwgPT4gbC50b0xvd2VyQ2FzZSgpICE9PSB0aXRsZUxpbmUudG9Mb3dlckNhc2UoKSkgfHwgJ1Vua25vd24gQ29tcGFueSdcbiAgfTtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgcG9zaXRpb24gbGFiZWw6XG4gKiAtIENhcGl0YWxpemUgZWFjaCB3b3JkXG4gKiAtIFJlbW92ZSB0cmFpbGluZyBcInJvbGVcIiwgXCJwb3NpdGlvblwiLCBcInRpdGxlXCIsIFwiam9iXCJcbiAqIEV4YW1wbGVzOlxuICogLSBcInNlbmlvciBkYXRhIHNjaWVudGlzdFwiIFx1MjE5MiBcIlNlbmlvciBEYXRhIFNjaWVudGlzdFwiXG4gKiAtIFwiZGlyZWN0b3Igb2YgZW5naW5lZXJpbmdcIiBcdTIxOTIgXCJEaXJlY3RvciBvZiBFbmdpbmVlcmluZ1wiXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBvc2l0aW9uTGFiZWwodGl0bGUsIGNvbXBhbnkpIHtcbiAgbGV0IG5vcm1hbGl6ZWQgPSB0aXRsZVxuICAgIC5zcGxpdCgnICcpXG4gICAgLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCkpXG4gICAgLmpvaW4oJyAnKTtcblxuICAvLyBSZW1vdmUgY29tbW9uIHN1ZmZpeGVzXG4gIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkXG4gICAgLnJlcGxhY2UoL1xccysocm9sZXxwb3NpdGlvbnx0aXRsZXxqb2IpXFxzKiQvaSwgJycpXG4gICAgLnRyaW0oKTtcblxuICByZXR1cm4gbm9ybWFsaXplZCB8fCAnUHJvZmVzc2lvbmFsIFJvbGUnO1xufVxuXG4vKipcbiAqIFN0cmlwIEhUTUwgdGFncyBmcm9tIHN0cmluZy5cbiAqIFJlbW92ZXMgYWxsIDx0YWc+Li4uPC90YWc+IHBhdHRlcm5zLlxuICovXG5mdW5jdGlvbiBzdHJpcEh0bWwoaHRtbCkge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKC88W14+XSo+L2csICcnKTtcbn1cblxuLyoqXG4gKiBUcnVuY2F0ZSB0ZXh0IHRvIG1heCBsZW5ndGggd2l0aCBlbGxpcHNpcy5cbiAqIFByZXNlcnZlcyB3b3JkIGJvdW5kYXJpZXMgd2hlbiBwb3NzaWJsZS5cbiAqL1xuZnVuY3Rpb24gdHJ1bmNhdGVUZXh0KHRleHQsIG1heExlbmd0aCA9IDEwMCkge1xuICBpZiAodGV4dC5sZW5ndGggPD0gbWF4TGVuZ3RoKSByZXR1cm4gdGV4dDtcblxuICAvLyBUcnVuY2F0ZSBhdCBtYXggbGVuZ3RoXG4gIGxldCB0cnVuY2F0ZWQgPSB0ZXh0LnN1YnN0cmluZygwLCBtYXhMZW5ndGgpO1xuXG4gIC8vIFRyeSB0byBmaW5kIHRoZSBsYXN0IHNwYWNlIHRvIGF2b2lkIGN1dHRpbmcgd29yZHNcbiAgY29uc3QgbGFzdFNwYWNlID0gdHJ1bmNhdGVkLmxhc3RJbmRleE9mKCcgJyk7XG4gIGlmIChsYXN0U3BhY2UgPiBNYXRoLmZsb29yKG1heExlbmd0aCAqIDAuNzUpKSB7XG4gICAgdHJ1bmNhdGVkID0gdHJ1bmNhdGVkLnN1YnN0cmluZygwLCBsYXN0U3BhY2UpO1xuICB9XG5cbiAgcmV0dXJuIHRydW5jYXRlZCArICdcdTIwMjYnO1xufVxuXG4vKipcbiAqIENhcGl0YWxpemUgZmlyc3QgbGV0dGVyIG9mIGVhY2ggd29yZC5cbiAqL1xuZnVuY3Rpb24gY2FwaXRhbGl6ZVdvcmRzKHRleHQpIHtcbiAgcmV0dXJuIHRleHRcbiAgICAuc3BsaXQoJyAnKVxuICAgIC5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKS50b0xvd2VyQ2FzZSgpKVxuICAgIC5qb2luKCcgJyk7XG59XG5cbi8qKlxuICogQ29uZGl0aW9uYWwgcGx1cmFsaXphdGlvbiBoZWxwZXIuXG4gKiBFeGFtcGxlOiBwbHVyYWxpemUoMSwgJ2l0ZW0nLCAnaXRlbXMnKSBcdTIxOTIgJ2l0ZW0nXG4gKiAgICAgICAgICBwbHVyYWxpemUoMywgJ2l0ZW0nLCAnaXRlbXMnKSBcdTIxOTIgJ2l0ZW1zJ1xuICovXG5mdW5jdGlvbiBwbHVyYWxpemUoY291bnQsIHNpbmd1bGFyLCBwbHVyYWwpIHtcbiAgcmV0dXJuIGNvdW50ID09PSAxID8gc2luZ3VsYXIgOiBwbHVyYWw7XG59XG5cbi8qKlxuICogSHVtYW4tcmVhZGFibGUgdGltZSBkdXJhdGlvbi5cbiAqIEV4YW1wbGU6IDUwMDAgXHUyMTkyIFwiNSBzZWNvbmRzXCIsIDY1MDAwIFx1MjE5MiBcIjEgbWludXRlXCJcbiAqL1xuZnVuY3Rpb24gZm9ybWF0RHVyYXRpb24obXMpIHtcbiAgY29uc3Qgc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgLyAxMDAwKTtcbiAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDYwKTtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG5cbiAgaWYgKGhvdXJzID4gMCkgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gIGlmIChtaW51dGVzID4gMCkgcmV0dXJuIGAke21pbnV0ZXN9bSAke3NlY29uZHMgJSA2MH1zYDtcbiAgcmV0dXJuIGAke3NlY29uZHN9c2A7XG59XG5cbi8qKlxuICogT3JkaW5hbCBudW1iZXIgc3VmZml4LlxuICogRXhhbXBsZTogMSBcdTIxOTIgXCIxc3RcIiwgMiBcdTIxOTIgXCIybmRcIiwgMyBcdTIxOTIgXCIzcmRcIiwgNCBcdTIxOTIgXCI0dGhcIlxuICovXG5mdW5jdGlvbiBvcmRpbmFsKG4pIHtcbiAgY29uc3QgcyA9IFsndGgnLCAnc3QnLCAnbmQnLCAncmQnXTtcbiAgY29uc3QgdiA9IG4gJSAxMDA7XG4gIHJldHVybiBuICsgKHNbKHYgLSAyMCkgJSAxMF0gfHwgc1t2XSB8fCBzWzBdKTtcbn1cblxuLy8gVXRpbGl0eSBmdW5jdGlvbnMgZm9yIHNlc3Npb24gbWFuYWdlbWVudCBhbmQgZm9ybWF0dGluZ1xuXG4vKipcbiAqIEZvcm1hdCBzZXNzaW9uIHBoYXNlIGxhYmVscy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwaGFzZSAtIFRoZSBwaGFzZSBzdHJpbmcgdG8gZm9ybWF0LlxuICogQHJldHVybnMge3N0cmluZ30gLSBUaGUgZm9ybWF0dGVkIHBoYXNlIGxhYmVsLlxuICovXG5mdW5jdGlvbiBmb3JtYXRTZXNzaW9uUGhhc2VMYWJlbChwaGFzZSkge1xuICBjb25zdCBTRVNTSU9OX1BIQVNFX0xBQkVMUyA9IHtcbiAgICBpbml0OiAnaW5pdCcsXG4gICAgam9iX2FuYWx5c2lzOiAnYW5hbHlzaXMnLFxuICAgIGN1c3RvbWl6YXRpb246ICdjdXN0b21pemF0aW9uJyxcbiAgICByZXdyaXRlX3JldmlldzogJ3Jld3JpdGUnLFxuICAgIHNwZWxsX2NoZWNrOiAnc3BlbGwgY2hlY2snLFxuICAgIGdlbmVyYXRpb246ICdnZW5lcmF0aW9uJyxcbiAgICBsYXlvdXRfcmV2aWV3OiAnbGF5b3V0IHJldmlldycsXG4gICAgcmVmaW5lbWVudDogJ2ZpbmFsaXNlJyxcbiAgfTtcblxuICBpZiAoIXBoYXNlKSByZXR1cm4gJ2luaXQnO1xuICByZXR1cm4gU0VTU0lPTl9QSEFTRV9MQUJFTFNbcGhhc2VdIHx8IFN0cmluZyhwaGFzZSkucmVwbGFjZSgvXy9nLCAnICcpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBzZXNzaW9uIHRpbWVzdGFtcHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGltZXN0YW1wIC0gVGhlIHRpbWVzdGFtcCB0byBmb3JtYXQuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEZvcm1hdHRpbmcgb3B0aW9ucy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaW5jbHVkZVRpbWU9dHJ1ZV0gLSBXaGV0aGVyIHRvIGluY2x1ZGUgdGltZSBpbiB0aGUgb3V0cHV0LlxuICogQHJldHVybnMge3N0cmluZ30gLSBUaGUgZm9ybWF0dGVkIHRpbWVzdGFtcC5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0U2Vzc2lvblRpbWVzdGFtcCh0aW1lc3RhbXAsIHsgaW5jbHVkZVRpbWUgPSB0cnVlIH0gPSB7fSkge1xuICBpZiAoIXRpbWVzdGFtcCkgcmV0dXJuICdcdTIwMTQnO1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lc3RhbXApLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHtcbiAgICAgIG1vbnRoOiAnc2hvcnQnLCBkYXk6ICdudW1lcmljJywgeWVhcjogJ251bWVyaWMnLFxuICAgICAgLi4uKGluY2x1ZGVUaW1lID8geyBob3VyOiAnbnVtZXJpYycsIG1pbnV0ZTogJzItZGlnaXQnIH0gOiB7fSksXG4gICAgfSk7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICByZXR1cm4gU3RyaW5nKHRpbWVzdGFtcCkucmVwbGFjZSgnVCcsICcgJykuc2xpY2UoMCwgaW5jbHVkZVRpbWUgPyAxNiA6IDEwKTtcbiAgfVxufVxuXG5leHBvcnQge1xuICBub3JtYWxpemVUZXh0LCBmbXREYXRlLCBjbGVhbkpzb25SZXNwb25zZSwgZXNjYXBlSHRtbCxcbiAgZXh0cmFjdFRpdGxlQW5kQ29tcGFueUZyb21Kb2JUZXh0LCBub3JtYWxpemVQb3NpdGlvbkxhYmVsLFxuICBzdHJpcEh0bWwsIHRydW5jYXRlVGV4dCwgY2FwaXRhbGl6ZVdvcmRzLCBwbHVyYWxpemUsXG4gIGZvcm1hdER1cmF0aW9uLCBvcmRpbmFsLFxuICBmb3JtYXRTZXNzaW9uUGhhc2VMYWJlbCwgZm9ybWF0U2Vzc2lvblRpbWVzdGFtcCxcbn07XG4iLCAiLyoqXG4gKiBhcGktY2xpZW50LmpzXG4gKiBDZW50cmFsaXplZCBIVFRQIGNvbW11bmljYXRpb24gbGF5ZXIuIEFsbCBBUEkgY2FsbHMgZ28gdGhyb3VnaCBhcGlDYWxsKCkuXG4gKiBQcm92aWRlcyBlcnJvciBoYW5kbGluZywgbG9nZ2luZywgYW5kIHJldHJ5IGxvZ2ljLlxuICovXG5cbi8qKlxuICogQ2VudHJhbGl6ZWQgbG9jYWxTdG9yYWdlIGtleSBtYW5hZ2VtZW50IHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gKi9cbmNvbnN0IFN0b3JhZ2VLZXlzID0ge1xuICBTRVNTSU9OX0lEOiAgICdjdi1idWlsZGVyLXNlc3Npb24taWQnLFxuICBTRVNTSU9OX1BBVEg6ICdjdi1idWlsZGVyLXNlc3Npb24tcGF0aCcsXG4gIFRBQl9EQVRBOiAgICAgJ2N2LWJ1aWxkZXItdGFiLWRhdGEnLFxuICBDVVJSRU5UX1RBQjogICdjdi1idWlsZGVyLWN1cnJlbnQtdGFiJyxcbiAgQ0hBVF9DT0xMQVBTRUQ6ICdjdi1idWlsZGVyLWNoYXQtY29sbGFwc2VkJ1xufTtcblxuY29uc3QgT1dORVJfVE9LRU5fS0VZID0gJ2N2LWJ1aWxkZXItb3duZXItdG9rZW4nO1xuXG5mdW5jdGlvbiBnZXRTZXNzaW9uSWRGcm9tVVJMKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5sb2NhdGlvbikgcmV0dXJuIG51bGw7XG4gIHJldHVybiBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpLmdldCgnc2Vzc2lvbicpO1xufVxuXG5mdW5jdGlvbiBzZXRTZXNzaW9uSWRJblVSTChzZXNzaW9uSWQsIHsgcmVwbGFjZSA9IGZhbHNlIH0gPSB7fSkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5sb2NhdGlvbiB8fCAhd2luZG93Lmhpc3RvcnkgfHwgIXNlc3Npb25JZCkgcmV0dXJuO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3Nlc3Npb24nLCBzZXNzaW9uSWQpO1xuICBpZiAocmVwbGFjZSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgJycsIHVybC50b1N0cmluZygpKTtcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB1cmwudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0T3duZXJUb2tlbigpIHtcbiAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICBsZXQgdG9rZW4gPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKE9XTkVSX1RPS0VOX0tFWSk7XG4gIGlmICghdG9rZW4pIHtcbiAgICBpZiAodHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0b2tlbiA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRva2VuID0gYHRhYi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMiwgMTApfWA7XG4gICAgfVxuICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oT1dORVJfVE9LRU5fS0VZLCB0b2tlbik7XG4gIH1cbiAgcmV0dXJuIHRva2VuO1xufVxuXG5mdW5jdGlvbiBnZXRTY29wZWRUYWJEYXRhU3RvcmFnZUtleShzZXNzaW9uSWQgPSBudWxsKSB7XG4gIGNvbnN0IHNjb3BlZFNlc3Npb25JZCA9IHNlc3Npb25JZCB8fCBnZXRTZXNzaW9uSWRGcm9tVVJMKCk7XG4gIHJldHVybiBzY29wZWRTZXNzaW9uSWRcbiAgICA/IGAke1N0b3JhZ2VLZXlzLlRBQl9EQVRBfS0ke3Njb3BlZFNlc3Npb25JZH1gXG4gICAgOiBTdG9yYWdlS2V5cy5UQUJfREFUQTtcbn1cblxuZnVuY3Rpb24gX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHBhdGhuYW1lKSB7XG4gIHJldHVybiBwYXRobmFtZSA9PT0gJy9hcGkvc2Vzc2lvbnMvbmV3J1xuICAgIHx8IHBhdGhuYW1lID09PSAnL2FwaS9zZXNzaW9ucy9jbGFpbSdcbiAgICB8fCBwYXRobmFtZSA9PT0gJy9hcGkvc2Vzc2lvbnMvdGFrZW92ZXInO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRTZXNzaW9uQXdhcmVSZXF1ZXN0KGlucHV0LCBpbml0ID0ge30pIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnIHx8ICF3aW5kb3cubG9jYXRpb24pIHtcbiAgICByZXR1cm4gW2lucHV0LCBpbml0XTtcbiAgfVxuXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IGlucHV0IDogaW5wdXQudXJsLCB3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgaWYgKCF1cmwucGF0aG5hbWUuc3RhcnRzV2l0aCgnL2FwaS8nKSkge1xuICAgIHJldHVybiBbaW5wdXQsIGluaXRdO1xuICB9XG5cbiAgY29uc3Qgb3duZXJUb2tlbiA9IGdldE93bmVyVG9rZW4oKTtcbiAgaWYgKCF1cmwuc2VhcmNoUGFyYW1zLmhhcygnb3duZXJfdG9rZW4nKSAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkgJiYgb3duZXJUb2tlbikge1xuICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KCdvd25lcl90b2tlbicsIG93bmVyVG9rZW4pO1xuICB9XG5cbiAgY29uc3Qgc2Vzc2lvbklkID0gZ2V0U2Vzc2lvbklkRnJvbVVSTCgpO1xuICBpZiAoIXNlc3Npb25JZCkge1xuICAgIHJldHVybiBbdXJsLnRvU3RyaW5nKCksIGluaXRdO1xuICB9XG5cbiAgY29uc3QgbWV0aG9kID0gKGluaXQubWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBuZXh0SW5pdCA9IHsgLi4uaW5pdCB9O1xuICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5pdC5oZWFkZXJzIHx8IHt9KTtcblxuICBpZiAoIXVybC5zZWFyY2hQYXJhbXMuaGFzKCdzZXNzaW9uX2lkJykgJiYgIV9pc1Nlc3Npb25NYW5hZ2VtZW50UGF0aCh1cmwucGF0aG5hbWUpKSB7XG4gICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3Nlc3Npb25faWQnLCBzZXNzaW9uSWQpO1xuICB9XG5cbiAgY29uc3QgbmVlZHNCb2R5Q29udGV4dCA9ICFbJ0dFVCcsICdIRUFEJ10uaW5jbHVkZXMobWV0aG9kKTtcbiAgY29uc3QgYm9keSA9IG5leHRJbml0LmJvZHk7XG4gIGNvbnN0IGlzRm9ybURhdGEgPSB0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YTtcbiAgY29uc3QgaXNVUkxTZWFyY2hQYXJhbXMgPSB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSAndW5kZWZpbmVkJyAmJiBib2R5IGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xuICBjb25zdCBjb250ZW50VHlwZSA9IGhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSB8fCAnJztcblxuICBpZiAobmVlZHNCb2R5Q29udGV4dCAmJiAhaXNGb3JtRGF0YSAmJiAhaXNVUkxTZWFyY2hQYXJhbXMpIHtcbiAgICBsZXQgcGF5bG9hZCA9IHt9O1xuICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycgJiYgYm9keS50cmltKCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gW3VybC50b1N0cmluZygpLCBuZXh0SW5pdF07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChib2R5ID09IG51bGwpIHtcbiAgICAgIHBheWxvYWQgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnb2JqZWN0Jykge1xuICAgICAgcGF5bG9hZCA9IHsgLi4uYm9keSB9O1xuICAgIH1cblxuICAgIGlmIChwYXlsb2FkLnNlc3Npb25faWQgPT0gbnVsbCAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkpIHtcbiAgICAgIHBheWxvYWQuc2Vzc2lvbl9pZCA9IHNlc3Npb25JZDtcbiAgICB9XG4gICAgaWYgKHBheWxvYWQub3duZXJfdG9rZW4gPT0gbnVsbCAmJiAhX2lzU2Vzc2lvbk1hbmFnZW1lbnRQYXRoKHVybC5wYXRobmFtZSkpIHtcbiAgICAgIGlmIChvd25lclRva2VuKSBwYXlsb2FkLm93bmVyX3Rva2VuID0gb3duZXJUb2tlbjtcbiAgICB9XG5cbiAgICBuZXh0SW5pdC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCk7XG4gICAgaWYgKCFjb250ZW50VHlwZSkge1xuICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgfVxuICB9XG5cbiAgbmV4dEluaXQuaGVhZGVycyA9IGhlYWRlcnM7XG4gIHJldHVybiBbdXJsLnRvU3RyaW5nKCksIG5leHRJbml0XTtcbn1cblxuY29uc3QgX25hdGl2ZUZldGNoID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5mZXRjaCA9PT0gJ2Z1bmN0aW9uJ1xuICA/IHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdylcbiAgOiAodHlwZW9mIGdsb2JhbFRoaXMuZmV0Y2ggPT09ICdmdW5jdGlvbicgPyBnbG9iYWxUaGlzLmZldGNoLmJpbmQoZ2xvYmFsVGhpcykgOiBudWxsKTtcblxuYXN5bmMgZnVuY3Rpb24gc2Vzc2lvbkF3YXJlRmV0Y2goaW5wdXQsIGluaXQgPSB7fSkge1xuICBpZiAoX25hdGl2ZUZldGNoID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZldGNoIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgfVxuICBjb25zdCBbbmV4dElucHV0LCBuZXh0SW5pdF0gPSBfYnVpbGRTZXNzaW9uQXdhcmVSZXF1ZXN0KGlucHV0LCBpbml0KTtcbiAgcmV0dXJuIF9uYXRpdmVGZXRjaChuZXh0SW5wdXQsIG5leHRJbml0KTtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuZmV0Y2ggPT09ICdmdW5jdGlvbicpIHtcbiAgd2luZG93LmZldGNoID0gc2Vzc2lvbkF3YXJlRmV0Y2g7XG59XG5cbi8qKlxuICogQmFzZSBBUEkgY2FsbCBmdW5jdGlvbiB3aXRoIGVycm9yIGhhbmRsaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIEhUVFAgbWV0aG9kIChHRVQsIFBPU1QsIGV0Yy4pXG4gKiBAcGFyYW0ge3N0cmluZ30gZW5kcG9pbnQgLSBBUEkgZW5kcG9pbnQgKGUuZy4sICcvYXBpL3N0YXR1cycpXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFJlcXVlc3QgYm9keSBkYXRhIChmb3IgUE9TVC9QVVQpXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxvYmplY3Q+fSBQYXJzZWQgSlNPTiByZXNwb25zZVxuICovXG5hc3luYyBmdW5jdGlvbiBhcGlDYWxsKG1ldGhvZCwgZW5kcG9pbnQsIGRhdGEgPSBudWxsKSB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9XG4gIH07XG5cbiAgaWYgKGRhdGEgJiYgKG1ldGhvZCA9PT0gJ1BPU1QnIHx8IG1ldGhvZCA9PT0gJ1BVVCcpKSB7XG4gICAgb3B0aW9ucy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2Vzc2lvbkF3YXJlRmV0Y2goZW5kcG9pbnQsIG9wdGlvbnMpO1xuXG4gICAgLy8gSGFuZGxlIDQwOSBDb25mbGljdCAoc2Vzc2lvbiBhbHJlYWR5IGFjdGl2ZSlcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgU2Vzc2lvbiBjb25mbGljdCBvbiAke2VuZHBvaW50fWApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXNzaW9uIGFscmVhZHkgYWN0aXZlIGluIGFub3RoZXIgdGFiJyk7XG4gICAgfVxuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIG9uICR7bWV0aG9kfSAke2VuZHBvaW50fTpgLCByZXNwb25zZS5zdGF0dXMsIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQ7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBlcnJvckpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICAgIGlmIChlcnJvckpzb24gJiYgdHlwZW9mIGVycm9ySnNvbiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvckpzb24uZXJyb3IgfHwgZXJyb3JKc29uLm1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBzdGF0dXMgdGV4dCB3aGVuIHJlc3BvbnNlIGlzIG5vdCBKU09OLlxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Jlc3BvbnNlLnN0YXR1c306ICR7ZXJyb3JNZXNzYWdlfWApO1xuICAgIH1cblxuICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgQVBJIGNhbGwgZmFpbGVkOiAke21ldGhvZH0gJHtlbmRwb2ludH1gLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb24gTWFuYWdlbWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZFNlc3Npb24oc2Vzc2lvbklkKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCBgL2FwaS9sb2FkLXNlc3Npb24/aWQ9JHtlbmNvZGVVUklDb21wb25lbnQoc2Vzc2lvbklkKX1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbigpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9zZXNzaW9ucy9uZXcnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZGVsZXRlU2Vzc2lvbihzZXNzaW9uSWQpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9kZWxldGUtc2Vzc2lvbicsIHsgc2Vzc2lvbl9pZDogc2Vzc2lvbklkIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFN0YXR1cygpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsICcvYXBpL3N0YXR1cycpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEhpc3RvcnkoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9oaXN0b3J5Jyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNhdmVTZXNzaW9uKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3NhdmUnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jlc2V0Jyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09XG4vLyBKb2IgSW5wdXQgJiBMb2FkaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuXG5hc3luYyBmdW5jdGlvbiB1cGxvYWRKb2JGaWxlKGZvcm1EYXRhKSB7XG4gIC8vIEZvcm1EYXRhIGRvZXNuJ3Qgd29yayB3ZWxsIHdpdGggYXBpQ2FsbCwgdXNlIGRpcmVjdCBmZXRjaCBidXQgd3JhcCBlcnJvciBoYW5kbGluZ1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJy9hcGkvdXBsb2FkLWZpbGUnLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGJvZHk6IGZvcm1EYXRhXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3Igb24gUE9TVCAvYXBpL3VwbG9hZC1maWxlOmAsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgIH1cblxuICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgQVBJIGNhbGwgZmFpbGVkOiBQT1NUIC9hcGkvdXBsb2FkLWZpbGVgLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc3VibWl0Sm9iVGV4dChqb2JUZXh0KSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvam9iJywgeyBqb2JfZGVzY3JpcHRpb246IGpvYlRleHQgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoSm9iRnJvbVVybCh1cmwpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9mZXRjaC1qb2ItdXJsJywgeyB1cmwgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRKb2JGaWxlKHBhdGgpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsIGAvYXBpL2xvYWQtam9iLWZpbGU/cGF0aD0ke2VuY29kZVVSSUNvbXBvbmVudChwYXRoKX1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZEV4aXN0aW5nSXRlbXMoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9sb2FkLWl0ZW1zJyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09XG4vLyBBbmFseXNpc1xuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZUpvYigpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9hY3Rpb24nLCB7IGFjdGlvbjogJ2FuYWx5emVfam9iJyB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNrUG9zdEFuYWx5c2lzUXVlc3Rpb25zKGFuYWx5c2lzRGF0YSkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Bvc3QtYW5hbHlzaXMtcXVlc3Rpb25zJywgeyBhbmFseXNpczogYW5hbHlzaXNEYXRhIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdWJtaXRQb3N0QW5hbHlzaXNBbnN3ZXJzKGFuc3dlcnMpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9wb3N0LWFuYWx5c2lzLXJlc3BvbnNlcycsIHsgYW5zd2VycyB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIE1lc3NhZ2VzICYgQ29udmVyc2F0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuXG5hc3luYyBmdW5jdGlvbiBzZW5kTWVzc2FnZShtZXNzYWdlKSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvbWVzc2FnZScsIHsgbWVzc2FnZSB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2VuZEFjdGlvbihhY3Rpb24sIGRhdGEgPSB7fSkge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL2FjdGlvbicsIHsgYWN0aW9uLCAuLi5kYXRhIH0pO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuLy8gQ1YgRGF0YSAmIEVkaXRpbmdcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoQ1ZEYXRhKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnR0VUJywgJy9hcGkvY3YtZGF0YScpO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDVkRhdGEoY3ZEYXRhKSB7XG4gIHJldHVybiBhcGlDYWxsKCdQT1NUJywgJy9hcGkvY3YtZGF0YScsIHsgY3ZfZGF0YTogY3ZEYXRhIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVFeHBlcmllbmNlKGV4cGVyaWVuY2VJZCwgdXBkYXRlcykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL2V4cGVyaWVuY2UtZGV0YWlscycsIHsgaWQ6IGV4cGVyaWVuY2VJZCwgLi4udXBkYXRlcyB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hFeHBlcmllbmNlRGV0YWlscyhleHBlcmllbmNlSWQpIHtcbiAgcmV0dXJuIGFwaUNhbGwoJ0dFVCcsIGAvYXBpL2V4cGVyaWVuY2UtZGV0YWlscz9pZD0ke2VuY29kZVVSSUNvbXBvbmVudChleHBlcmllbmNlSWQpfWApO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PVxuLy8gUmVjb21tZW5kYXRpb25zICYgQ3VzdG9taXphdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoUHVibGljYXRpb25SZWNvbW1lbmRhdGlvbnMoKSB7XG4gIHJldHVybiBhcGlDYWxsKCdHRVQnLCAnL2FwaS9wdWJsaWNhdGlvbi1yZWNvbW1lbmRhdGlvbnMnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3VibWl0UmV2aWV3RGVjaXNpb25zKGRlY2lzaW9ucykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jldmlldy1kZWNpc2lvbnMnLCBkZWNpc2lvbnMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJld3JpdGVzKCkge1xuICByZXR1cm4gYXBpQ2FsbCgnR0VUJywgJy9hcGkvcmV3cml0ZXMnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXBwcm92ZVJld3JpdGVzKGRlY2lzaW9ucykge1xuICByZXR1cm4gYXBpQ2FsbCgnUE9TVCcsICcvYXBpL3Jld3JpdGVzL2FwcHJvdmUnLCB7IGRlY2lzaW9ucyB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyYXRpb24gJiBEb3dubG9hZFxuLy8gPT09PT09PT09PT09PT09PT09PT1cblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVDVihvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICBmb3JtYXRzOiBvcHRpb25zLmZvcm1hdHMgfHwgWydhdHNfZG9jeCcsICdodW1hbl9wZGYnLCAnaHVtYW5fZG9jeCddLFxuICAgIC4uLm9wdGlvbnNcbiAgfTtcbiAgcmV0dXJuIGFwaUNhbGwoJ1BPU1QnLCAnL2FwaS9nZW5lcmF0ZScsIHBheWxvYWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZEZpbGUoZmlsZW5hbWUpIHtcbiAgLy8gRG93bmxvYWRzIGJ5cGFzcyBKU09OIHBhcnNpbmcgLSByZXR1cm4gYmxvYlxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvYXBpL2Rvd25sb2FkLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gKTtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkOiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gIH1cbiAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlcjogU2V0IExvYWRpbmcgU3RhdGVcbi8vID09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHNldExvYWRpbmcoaXNMb2FkaW5nKSB7XG4gIGxldCBsb2FkaW5nRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2FkaW5nLWluZGljYXRvcicpO1xuICBpZiAoIWxvYWRpbmdFbGVtZW50KSB7XG4gICAgLy8gQ3JlYXRlIGxvYWRpbmcgaW5kaWNhdG9yIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBsb2FkaW5nRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGxvYWRpbmdFbGVtZW50LmlkID0gJ2xvYWRpbmctaW5kaWNhdG9yJztcbiAgICBsb2FkaW5nRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobG9hZGluZ0VsZW1lbnQpO1xuICB9XG4gIGxvYWRpbmdFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc0xvYWRpbmcgPyAnYmxvY2snIDogJ25vbmUnO1xufVxuXG5leHBvcnQge1xuICBTdG9yYWdlS2V5cyxcbiAgT1dORVJfVE9LRU5fS0VZLFxuICBhcGlDYWxsLFxuICBnZXRTZXNzaW9uSWRGcm9tVVJMLFxuICBzZXRTZXNzaW9uSWRJblVSTCxcbiAgZ2V0T3duZXJUb2tlbixcbiAgZ2V0U2NvcGVkVGFiRGF0YVN0b3JhZ2VLZXksXG4gIHNlc3Npb25Bd2FyZUZldGNoLFxuICBsb2FkU2Vzc2lvbiwgZGVsZXRlU2Vzc2lvbiwgZmV0Y2hTdGF0dXMsIGZldGNoSGlzdG9yeSxcbiAgY3JlYXRlU2Vzc2lvbixcbiAgc2F2ZVNlc3Npb24sIHJlc2V0U2Vzc2lvbixcbiAgdXBsb2FkSm9iRmlsZSwgc3VibWl0Sm9iVGV4dCwgZmV0Y2hKb2JGcm9tVXJsLCBsb2FkSm9iRmlsZSwgbG9hZEV4aXN0aW5nSXRlbXMsXG4gIGFuYWx5emVKb2IsIGFza1Bvc3RBbmFseXNpc1F1ZXN0aW9ucywgc3VibWl0UG9zdEFuYWx5c2lzQW5zd2VycyxcbiAgc2VuZE1lc3NhZ2UsIHNlbmRBY3Rpb24sXG4gIGZldGNoQ1ZEYXRhLCB1cGRhdGVDVkRhdGEsIHVwZGF0ZUV4cGVyaWVuY2UsIGZldGNoRXhwZXJpZW5jZURldGFpbHMsXG4gIGZldGNoUHVibGljYXRpb25SZWNvbW1lbmRhdGlvbnMsIHN1Ym1pdFJldmlld0RlY2lzaW9ucyxcbiAgZmV0Y2hSZXdyaXRlcywgYXBwcm92ZVJld3JpdGVzLFxuICBnZW5lcmF0ZUNWLCBkb3dubG9hZEZpbGUsIHNldExvYWRpbmcsXG59O1xuIiwgIi8qKlxuICogc3RhdGUtbWFuYWdlci5qc1xuICogTWFuYWdlcyBzZXNzaW9uIHN0YXRlLCBsb2NhbFN0b3JhZ2UgcGVyc2lzdGVuY2UsIGFuZCBzdGF0ZSBpbml0aWFsaXphdGlvbi5cbiAqIENlbnRyYWxpemVzIGFsbCBzdGF0ZSBtYW5hZ2VtZW50IGxvZ2ljIChjdXJyZW50VGFiLCBpbnRlcmFjdGl2ZVN0YXRlLCBzZXNzaW9uSWQsIGV0Yy4pXG4gKi9cblxuaW1wb3J0IHsgU3RvcmFnZUtleXMgfSBmcm9tICcuL2FwaS1jbGllbnQuanMnO1xuXG4vKipcbiAqIE1pcnJvciBvZiB0aGUgUHl0aG9uIFBoYXNlIGVudW0gaW4gc2NyaXB0cy91dGlscy9jb252ZXJzYXRpb25fbWFuYWdlci5weS5cbiAqIFB5dGhvbiBpcyB0aGUgU09VUkNFIE9GIFRSVVRIIFx1MjAxNCB1cGRhdGUgYm90aCBmaWxlcyB0b2dldGhlciB3aGVuZXZlciBhZGRpbmdcbiAqIG9yIHJlbmFtaW5nIGEgcGhhc2UuXG4gKi9cbmNvbnN0IFBIQVNFUyA9IHtcbiAgSU5JVDogICAgICAgICAgICdpbml0JyxcbiAgSk9CX0FOQUxZU0lTOiAgICdqb2JfYW5hbHlzaXMnLFxuICBDVVNUT01JWkFUSU9OOiAgJ2N1c3RvbWl6YXRpb24nLFxuICBSRVdSSVRFX1JFVklFVzogJ3Jld3JpdGVfcmV2aWV3JyxcbiAgU1BFTExfQ0hFQ0s6ICAgICdzcGVsbF9jaGVjaycsXG4gIEdFTkVSQVRJT046ICAgICAnZ2VuZXJhdGlvbicsXG4gIExBWU9VVF9SRVZJRVc6ICAnbGF5b3V0X3JldmlldycsXG4gIFJFRklORU1FTlQ6ICAgICAncmVmaW5lbWVudCcsXG59O1xuXG4vKipcbiAqIFN0YWdlZCBnZW5lcmF0aW9uIHdvcmtmbG93IHBoYXNlcyAoR0FQLTIwIGltcGxlbWVudGF0aW9uKS5cbiAqIFRoZXNlIHRyYWNrIHRoZSBwcmV2aWV3IFx1MjE5MiBsYXlvdXQtcmV2aWV3IFx1MjE5MiBjb25maXJtZWQgXHUyMTkyIGZpbmFsIHBpcGVsaW5lXG4gKiBpbmRlcGVuZGVudGx5IG9mIHRoZSBtYWluIGNvbnZlcnNhdGlvbiBQSEFTRVMgYWJvdmUuXG4gKiBCYWNrZW5kIHNvdXJjZSBvZiB0cnV0aCBpcyBzZXNzaW9uX2RhdGFbJ2dlbmVyYXRpb25fc3RhdGUnXVsncGhhc2UnXS5cbiAqL1xuY29uc3QgR0VORVJBVElPTl9QSEFTRVMgPSB7XG4gIElETEU6ICAgICAgICAgICAnaWRsZScsICAgICAgICAgICAvLyBObyBwcmV2aWV3IGdlbmVyYXRlZCB5ZXRcbiAgUFJFVklFVzogICAgICAgICdwcmV2aWV3JywgICAgICAgIC8vIEhUTUwgcHJldmlldyBnZW5lcmF0ZWQ7IGluIGxheW91dCByZXZpZXdcbiAgQ09ORklSTUVEOiAgICAgICdjb25maXJtZWQnLCAgICAgIC8vIExheW91dCBjb25maXJtZWQ7IGF3YWl0aW5nIGZpbmFsIG91dHB1dHNcbiAgRklOQUxfQ09NUExFVEU6ICdmaW5hbF9jb21wbGV0ZScsIC8vIEZpbmFsIFBERi9ET0NYIHByb2R1Y2VkXG59O1xuXG4vLyBHbG9iYWwgc3RhdGUgdmFyaWFibGVzIChtb3ZlZCBpbnRvIG1vZHVsZSBmb3IgY2xhcml0eSlcbmxldCBjdXJyZW50VGFiID0gJ2pvYic7XG5sZXQgaXNMb2FkaW5nID0gZmFsc2U7XG5sZXQgdGFiRGF0YSA9IHtcbiAgYW5hbHlzaXM6IG51bGwsXG4gIGN1c3RvbWl6YXRpb25zOiBudWxsLFxuICBjdjogbnVsbFxufTtcbmxldCBpbnRlcmFjdGl2ZVN0YXRlID0ge1xuICBpc1Jldmlld2luZzogZmFsc2UsXG4gIGN1cnJlbnRJbmRleDogMCxcbiAgdHlwZTogbnVsbCwgLy8gJ2V4cGVyaWVuY2VzJyBvciAnc2tpbGxzJ1xuICBkYXRhOiBudWxsXG59O1xubGV0IHNlc3Npb25JZCA9IG51bGw7XG5sZXQgbGFzdEtub3duUGhhc2UgPSBQSEFTRVMuSU5JVDtcbmxldCBpc1JlY29ubmVjdGluZyA9IGZhbHNlO1xuLy8gQ3VycmVudCBtb2RlbC9wcm92aWRlciBzZWxlY3Rpb24gKHBlcnNpc3RlZCB0byBsb2NhbFN0b3JhZ2UpXG5sZXQgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBudWxsO1xubGV0IGN1cnJlbnRNb2RlbE5hbWUgPSBudWxsO1xuXG4vLyBTdGFnZWQgZ2VuZXJhdGlvbiBzdGF0ZSAoR0FQLTIwKTogdHJhY2tzIHByZXZpZXcgXHUyMTkyIGNvbmZpcm0gXHUyMTkyIGZpbmFsIHBpcGVsaW5lLlxuLy8gU3luY2VkIGZyb20gL2FwaS9jdi9nZW5lcmF0aW9uLXN0YXRlIG9uIHBhZ2UgbG9hZCBhbmQgYWZ0ZXIga2V5IHRyYW5zaXRpb25zLlxubGV0IGdlbmVyYXRpb25TdGF0ZSA9IHtcbiAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gIHByZXZpZXdBdmFpbGFibGU6IGZhbHNlLFxuICBsYXlvdXRDb25maXJtZWQ6IGZhbHNlLFxuICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgcGFnZVdhcm5pbmc6IGZhbHNlLFxuICBsYXlvdXRJbnN0cnVjdGlvbnNDb3VudDogMCxcbn07XG5cbi8vIEFUUyBzY29yZSBzdGF0ZSAoR0FQLTIxKTogY2FjaGVkIHNjb3JlIGZyb20gL2FwaS9jdi9hdHMtc2NvcmUuXG4vLyBOdWxsIHVudGlsIGZpcnN0IHNjb3JlIGlzIGZldGNoZWQuXG5sZXQgYXRzU2NvcmUgPSBudWxsO1xuXG4vLyBFeHBvcnQgc3RhdGUgZ2V0dGVycy9zZXR0ZXJzXG5jb25zdCBzdGF0ZU1hbmFnZXIgPSB7XG4gIC8vIFRhYiBzdGF0ZVxuICBnZXRDdXJyZW50VGFiOiAoKSA9PiBjdXJyZW50VGFiLFxuICBzZXRDdXJyZW50VGFiOiAodGFiKSA9PiB7IGN1cnJlbnRUYWIgPSB0YWI7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gTG9hZGluZyBzdGF0ZVxuICBpc0xvYWRpbmc6ICgpID0+IGlzTG9hZGluZyxcbiAgc2V0TG9hZGluZzogKGxvYWRpbmcpID0+IHsgaXNMb2FkaW5nID0gbG9hZGluZzsgfSxcblxuICAvLyBUYWIgZGF0YSAoYW5hbHlzaXMsIGN1c3RvbWl6YXRpb25zLCBDVilcbiAgZ2V0VGFiRGF0YTogKHRhYikgPT4gdGFiRGF0YVt0YWJdLFxuICBzZXRUYWJEYXRhOiAodGFiLCBkYXRhKSA9PiB7IHRhYkRhdGFbdGFiXSA9IGRhdGE7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gSW50ZXJhY3RpdmUgc3RhdGUgKGZvciBleHBlcmllbmNlL3NraWxsIHNlbGVjdGlvbiByZXZpZXcpXG4gIGdldEludGVyYWN0aXZlU3RhdGU6ICgpID0+IGludGVyYWN0aXZlU3RhdGUsXG4gIHNldEludGVyYWN0aXZlU3RhdGU6IChzdGF0ZSkgPT4geyBpbnRlcmFjdGl2ZVN0YXRlID0geyAuLi5pbnRlcmFjdGl2ZVN0YXRlLCAuLi5zdGF0ZSB9OyBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpOyB9LFxuXG4gIC8vIFNlc3Npb24gbWFuYWdlbWVudFxuICBnZXRTZXNzaW9uSWQ6ICgpID0+IHNlc3Npb25JZCxcbiAgc2V0U2Vzc2lvbklkOiAoaWQpID0+IHsgc2Vzc2lvbklkID0gaWQ7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlNFU1NJT05fSUQsIGlkKTsgfSxcblxuICAvLyBNb2RlbC9wcm92aWRlciBzZWxlY3Rpb25cbiAgZ2V0Q3VycmVudE1vZGVsUHJvdmlkZXI6ICgpID0+IGN1cnJlbnRNb2RlbFByb3ZpZGVyLFxuICBnZXRDdXJyZW50TW9kZWxOYW1lOiAoKSA9PiBjdXJyZW50TW9kZWxOYW1lLFxuICBzZXRDdXJyZW50TW9kZWw6IChwcm92aWRlciwgbW9kZWwpID0+IHsgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBwcm92aWRlciB8fCBudWxsOyBjdXJyZW50TW9kZWxOYW1lID0gbW9kZWwgfHwgbnVsbDsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBQaGFzZSB0cmFja2luZ1xuICBnZXRQaGFzZTogKCkgPT4gbGFzdEtub3duUGhhc2UsXG4gIHNldFBoYXNlOiAocGhhc2UpID0+IHsgbGFzdEtub3duUGhhc2UgPSBwaGFzZTsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBQb3N0LWFuYWx5c2lzIHF1ZXN0aW9uc1xuICBnZXRQb3N0QW5hbHlzaXNRdWVzdGlvbnM6ICgpID0+IHdpbmRvdy5wb3N0QW5hbHlzaXNRdWVzdGlvbnMgfHwgW10sXG4gIHNldFBvc3RBbmFseXNpc1F1ZXN0aW9uczogKHF1ZXN0aW9ucykgPT4geyB3aW5kb3cucG9zdEFuYWx5c2lzUXVlc3Rpb25zID0gcXVlc3Rpb25zOyB9LFxuXG4gIC8vIFF1ZXN0aW9uIGFuc3dlcnNcbiAgZ2V0UXVlc3Rpb25BbnN3ZXJzOiAoKSA9PiB3aW5kb3cucXVlc3Rpb25BbnN3ZXJzIHx8IHt9LFxuICBzZXRRdWVzdGlvbkFuc3dlcnM6IChhbnN3ZXJzKSA9PiB7IHdpbmRvdy5xdWVzdGlvbkFuc3dlcnMgPSBhbnN3ZXJzOyB9LFxuXG4gIC8vIFBlbmRpbmcgcmVjb21tZW5kYXRpb25zXG4gIGdldFBlbmRpbmdSZWNvbW1lbmRhdGlvbnM6ICgpID0+IHdpbmRvdy5wZW5kaW5nUmVjb21tZW5kYXRpb25zIHx8IG51bGwsXG4gIHNldFBlbmRpbmdSZWNvbW1lbmRhdGlvbnM6IChyZWMpID0+IHsgd2luZG93LnBlbmRpbmdSZWNvbW1lbmRhdGlvbnMgPSByZWM7IHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7IH0sXG5cbiAgLy8gQVRTIHNjb3JlIHN0YXRlIChHQVAtMjEpXG4gIGdldEF0c1Njb3JlOiAoKSA9PiBhdHNTY29yZSxcbiAgc2V0QXRzU2NvcmU6IChzY29yZSkgPT4geyBhdHNTY29yZSA9IHNjb3JlOyBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpOyB9LFxuICBjbGVhckF0c1Njb3JlOiAoKSA9PiB7IGF0c1Njb3JlID0gbnVsbDsgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTsgfSxcblxuICAvLyBTdGFnZWQgZ2VuZXJhdGlvbiBzdGF0ZSAoR0FQLTIwKVxuICBnZXRHZW5lcmF0aW9uU3RhdGU6ICgpID0+IGdlbmVyYXRpb25TdGF0ZSxcbiAgc2V0R2VuZXJhdGlvblN0YXRlOiAodXBkYXRlKSA9PiB7XG4gICAgZ2VuZXJhdGlvblN0YXRlID0geyAuLi5nZW5lcmF0aW9uU3RhdGUsIC4uLnVwZGF0ZSB9O1xuICAgIHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XG4gIH0sXG4gIHJlc2V0R2VuZXJhdGlvblN0YXRlOiAoKSA9PiB7XG4gICAgZ2VuZXJhdGlvblN0YXRlID0ge1xuICAgICAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gICAgICBwcmV2aWV3QXZhaWxhYmxlOiBmYWxzZSxcbiAgICAgIGxheW91dENvbmZpcm1lZDogZmFsc2UsXG4gICAgICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgICAgIHBhZ2VXYXJuaW5nOiBmYWxzZSxcbiAgICAgIGxheW91dEluc3RydWN0aW9uc0NvdW50OiAwLFxuICAgIH07XG4gICAgc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTtcbiAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBmcmVzaCBzdGF0ZSBvYmplY3Qgd2l0aCBhbGwgZGVmYXVsdCB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVTdGF0ZSgpIHtcbiAgY3VycmVudFRhYiA9ICdqb2InO1xuICBpc0xvYWRpbmcgPSBmYWxzZTtcbiAgdGFiRGF0YSA9IHtcbiAgICBhbmFseXNpczogbnVsbCxcbiAgICBjdXN0b21pemF0aW9uczogbnVsbCxcbiAgICBjdjogbnVsbFxuICB9O1xuICBpbnRlcmFjdGl2ZVN0YXRlID0ge1xuICAgIGlzUmV2aWV3aW5nOiBmYWxzZSxcbiAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgdHlwZTogbnVsbCxcbiAgICBkYXRhOiBudWxsXG4gIH07XG4gIHdpbmRvdy5wb3N0QW5hbHlzaXNRdWVzdGlvbnMgPSBbXTtcbiAgd2luZG93LnF1ZXN0aW9uQW5zd2VycyA9IHt9O1xuICBsYXN0S25vd25QaGFzZSA9IFBIQVNFUy5JTklUO1xuICBnZW5lcmF0aW9uU3RhdGUgPSB7XG4gICAgcGhhc2U6IEdFTkVSQVRJT05fUEhBU0VTLklETEUsXG4gICAgcHJldmlld0F2YWlsYWJsZTogZmFsc2UsXG4gICAgbGF5b3V0Q29uZmlybWVkOiBmYWxzZSxcbiAgICBwYWdlQ291bnRFc3RpbWF0ZTogbnVsbCxcbiAgICBwYWdlV2FybmluZzogZmFsc2UsXG4gICAgbGF5b3V0SW5zdHJ1Y3Rpb25zQ291bnQ6IDAsXG4gIH07XG5cbiAgLy8gR2V0IG9yIGdlbmVyYXRlIHNlc3Npb24gSURcbiAgbGV0IHN0b3JlZElkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU3RvcmFnZUtleXMuU0VTU0lPTl9JRCk7XG4gIGlmICghc3RvcmVkSWQpIHtcbiAgICBzdG9yZWRJZCA9ICdzZXNzaW9uLScgKyBEYXRlLm5vdygpICsgJy0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlNFU1NJT05fSUQsIHN0b3JlZElkKTtcbiAgfVxuICBzZXNzaW9uSWQgPSBzdG9yZWRJZDtcblxuICBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpO1xufVxuXG4vKipcbiAqIExvYWQgc3RhdGUgZnJvbSBicm93c2VyIGxvY2FsU3RvcmFnZS5cbiAqL1xuZnVuY3Rpb24gbG9hZFN0YXRlRnJvbUxvY2FsU3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzYXZlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBKTtcbiAgICBpZiAoIXNhdmVkKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShzYXZlZCk7XG5cbiAgICAvLyBPbmx5IHJlc3RvcmUgaWYgZGF0YSBpcyByZWNlbnQgKHdpdGhpbiAyNCBob3VycylcbiAgICBjb25zdCBhZ2UgPSBEYXRlLm5vdygpIC0gKGRhdGEudGltZXN0YW1wIHx8IDApO1xuICAgIGlmIChhZ2UgPiAyNCAqIDYwICogNjAgKiAxMDAwKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShTdG9yYWdlS2V5cy5UQUJfREFUQSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gUmVzdG9yZSB0YWIgZGF0YVxuICAgIGlmIChkYXRhLnRhYkRhdGEpIHtcbiAgICAgIHRhYkRhdGEgPSB7IC4uLnRhYkRhdGEsIC4uLmRhdGEudGFiRGF0YSB9O1xuICAgIH1cblxuICAgIC8vIFJlc3RvcmUgaW50ZXJhY3RpdmUgc3RhdGVcbiAgICBpZiAoZGF0YS5pbnRlcmFjdGl2ZVN0YXRlKSB7XG4gICAgICBpbnRlcmFjdGl2ZVN0YXRlID0geyAuLi5pbnRlcmFjdGl2ZVN0YXRlLCAuLi5kYXRhLmludGVyYWN0aXZlU3RhdGUgfTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHBlbmRpbmcgcmVjb21tZW5kYXRpb25zXG4gICAgaWYgKGRhdGEucGVuZGluZ1JlY29tbWVuZGF0aW9ucykge1xuICAgICAgd2luZG93LnBlbmRpbmdSZWNvbW1lbmRhdGlvbnMgPSBkYXRhLnBlbmRpbmdSZWNvbW1lbmRhdGlvbnM7XG4gICAgfVxuXG4gICAgLy8gUmVzdG9yZSBzYXZlZCBtb2RlbC9wcm92aWRlciBzZWxlY3Rpb25cbiAgICBpZiAoZGF0YS5jdXJyZW50TW9kZWxQcm92aWRlcikge1xuICAgICAgY3VycmVudE1vZGVsUHJvdmlkZXIgPSBkYXRhLmN1cnJlbnRNb2RlbFByb3ZpZGVyO1xuICAgIH1cbiAgICBpZiAoZGF0YS5jdXJyZW50TW9kZWxOYW1lKSB7XG4gICAgICBjdXJyZW50TW9kZWxOYW1lID0gZGF0YS5jdXJyZW50TW9kZWxOYW1lO1xuICAgIH1cblxuICAgIC8vIFJlc3RvcmUgcG9zdC1hbmFseXNpcyBzdGF0ZVxuICAgIGlmIChkYXRhLnBvc3RBbmFseXNpc1F1ZXN0aW9ucykge1xuICAgICAgd2luZG93LnBvc3RBbmFseXNpc1F1ZXN0aW9ucyA9IGRhdGEucG9zdEFuYWx5c2lzUXVlc3Rpb25zO1xuICAgIH1cbiAgICBpZiAoZGF0YS5xdWVzdGlvbkFuc3dlcnMpIHtcbiAgICAgIHdpbmRvdy5xdWVzdGlvbkFuc3dlcnMgPSBkYXRhLnF1ZXN0aW9uQW5zd2VycztcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHBoYXNlXG4gICAgaWYgKGRhdGEubGFzdEtub3duUGhhc2UpIHtcbiAgICAgIGxhc3RLbm93blBoYXNlID0gZGF0YS5sYXN0S25vd25QaGFzZTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIHN0YWdlZCBnZW5lcmF0aW9uIHN0YXRlXG4gICAgaWYgKGRhdGEuZ2VuZXJhdGlvblN0YXRlKSB7XG4gICAgICBnZW5lcmF0aW9uU3RhdGUgPSB7IC4uLmdlbmVyYXRpb25TdGF0ZSwgLi4uZGF0YS5nZW5lcmF0aW9uU3RhdGUgfTtcbiAgICB9XG5cbiAgICAvLyBSZXN0b3JlIEFUUyBzY29yZVxuICAgIGlmIChkYXRhLmF0c1Njb3JlKSB7XG4gICAgICBhdHNTY29yZSA9IGRhdGEuYXRzU2NvcmU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCBzdGF0ZSBmcm9tIGxvY2FsU3RvcmFnZTonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogU2F2ZSBjdXJyZW50IHN0YXRlIHRvIGJyb3dzZXIgbG9jYWxTdG9yYWdlLlxuICovXG5mdW5jdGlvbiBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhVG9TYXZlID0ge1xuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgdGFiRGF0YSxcbiAgICAgIGludGVyYWN0aXZlU3RhdGUsXG4gICAgICBwZW5kaW5nUmVjb21tZW5kYXRpb25zOiB3aW5kb3cucGVuZGluZ1JlY29tbWVuZGF0aW9ucyxcbiAgICAgIHBvc3RBbmFseXNpc1F1ZXN0aW9uczogd2luZG93LnBvc3RBbmFseXNpc1F1ZXN0aW9ucyxcbiAgICAgIHF1ZXN0aW9uQW5zd2Vyczogd2luZG93LnF1ZXN0aW9uQW5zd2VycyxcbiAgICAgIGxhc3RLbm93blBoYXNlLFxuICAgICAgY3VycmVudFRhYixcbiAgICAgIC8vIFBlcnNpc3QgbGFzdC1zZWxlY3RlZCBtb2RlbC9wcm92aWRlciBzbyBVSSBzZWxlY3Rpb25zIHN1cnZpdmUgcmVsb2Fkc1xuICAgICAgY3VycmVudE1vZGVsUHJvdmlkZXIsXG4gICAgICBjdXJyZW50TW9kZWxOYW1lLFxuICAgICAgZ2VuZXJhdGlvblN0YXRlLFxuICAgICAgYXRzU2NvcmUsXG4gICAgfTtcblxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFN0b3JhZ2VLZXlzLlRBQl9EQVRBLCBKU09OLnN0cmluZ2lmeShkYXRhVG9TYXZlKSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gc2F2ZSBzdGF0ZSB0byBsb2NhbFN0b3JhZ2U6JywgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogQ2xlYXIgYWxsIHN0YXRlIChvbiBuZXcgc2Vzc2lvbiBvciByZXNldCBhY3Rpb24pLlxuICovXG5mdW5jdGlvbiBjbGVhclN0YXRlKCkge1xuICBpbml0aWFsaXplU3RhdGUoKTtcbiAgT2JqZWN0LnZhbHVlcyhTdG9yYWdlS2V5cykuZm9yRWFjaChrZXkgPT4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KSk7XG59XG5cbi8vIFRoZSBhdXRob3JpdGF0aXZlIHJlc3RvcmVTZXNzaW9uL3Jlc3RvcmVCYWNrZW5kU3RhdGUvbG9hZFNlc3Npb25GaWxlXG4vLyBpbXBsZW1lbnRhdGlvbnMgbGl2ZSBpbiBgd2ViL2FwcC5qc2AuIFJlbW92ZSBkdXBsaWNhdGUgaW1wbGVtZW50YXRpb25zXG4vLyBmcm9tIHRoaXMgbW9kdWxlIHRvIGF2b2lkIGNvbmZsaWN0aW5nIGJlaGF2aW9yIGFuZCBlbnN1cmUgYSBzaW5nbGVcbi8vIHJlc3RvcmUgcGF0aCBpcyB1c2VkIGJ5IHRoZSBhcHBsaWNhdGlvbi5cblxuZXhwb3J0IHtcbiAgUEhBU0VTLFxuICBHRU5FUkFUSU9OX1BIQVNFUyxcbiAgc3RhdGVNYW5hZ2VyLFxuICBpbml0aWFsaXplU3RhdGUsIGxvYWRTdGF0ZUZyb21Mb2NhbFN0b3JhZ2UsIHNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlLFxuICBjbGVhclN0YXRlLFxufTtcbiIsICIvKipcbiAqIHdlYi9zcmMvbWFpbi5qcyBcdTIwMTQgZXNidWlsZCBlbnRyeSBwb2ludCBmb3IgdGhlIG1vZHVsZXMgYnVuZGxlLlxuICpcbiAqIEJ1bmRsZXMgdXRpbHMsIGFwaS1jbGllbnQsIGFuZCBzdGF0ZS1tYW5hZ2VyIGFzIHByb3BlciBFUyBtb2R1bGVzIGFuZFxuICogYXNzaWducyBldmVyeSBleHBvcnQgdG8gYHdpbmRvd2Agc28gdGhhdCB0aGUgUGhhc2UtMiBsZWdhY3kgZ2xvYmFsIHNjcmlwdHNcbiAqIChhcHAuanMsIHVpLWNvcmUuanMsIGxheW91dC1pbnN0cnVjdGlvbi5qcykgY2FuIGNhbGwgdGhlc2UgZnVuY3Rpb25zIGFuZFxuICogcmVmZXJlbmNlIHRoZXNlIGNvbnN0YW50cyBhcyBiYXJlIGlkZW50aWZpZXJzIHdpdGhvdXQgYW55IGNoYW5nZXMuXG4gKlxuICogQnVpbGQ6ICBucG0gcnVuIGJ1aWxkICAgICAgICAgIFx1MjE5MiB3ZWIvbW9kdWxlcy5qcyAoZGV2ZWxvcG1lbnQsIHVubWluaWZpZWQpXG4gKiAgICAgICAgIG5wbSBydW4gYnVpbGQ6cHJvZCAgICAgXHUyMTkyIHdlYi9tb2R1bGVzLmpzIChtaW5pZmllZClcbiAqICAgICAgICAgbnBtIHJ1biBidWlsZDp3YXRjaCAgICBcdTIxOTIgcmVidWlsZCBvbiBldmVyeSBzb3VyY2UgY2hhbmdlXG4gKlxuICogUGhhc2UgMiAoZnV0dXJlKTogY29udmVydCBhcHAuanMsIHVpLWNvcmUuanMsIGxheW91dC1pbnN0cnVjdGlvbi5qcyB0byBFU1xuICogbW9kdWxlcywgaW1wb3J0IHRoZW0gaGVyZSwgYW5kIGNvbGxhcHNlIGFsbCA8c2NyaXB0PiB0YWdzIHRvIG9uZSBidW5kbGUuXG4gKi9cblxuaW1wb3J0ICogYXMgVXRpbHMgICAgICBmcm9tICcuLi91dGlscy5qcyc7XG5pbXBvcnQgKiBhcyBBcGlDbGllbnQgIGZyb20gJy4uL2FwaS1jbGllbnQuanMnO1xuaW1wb3J0ICogYXMgU3RhdGUgICAgICBmcm9tICcuLi9zdGF0ZS1tYW5hZ2VyLmpzJztcblxuLy8gRXhwb3NlIGV2ZXJ5IGV4cG9ydCB0byB0aGUgZ2xvYmFsIHNjb3BlIHNvIGxlZ2FjeSBzY3JpcHRzIGxvYWRlZCBBRlRFUlxuLy8gbW9kdWxlcy5qcyBjYW4gY2FsbCBlLmcuIGVzY2FwZUh0bWwoKSwgUEhBU0VTLklOSVQsIGFwaUZldGNoKCksIGV0Yy5cbi8vIEluIGEgYnJvd3NlciwgZ2xvYmFsVGhpcyA9PT0gd2luZG93LCBzbyBiYXJlIGZ1bmN0aW9uIGNhbGxzIHJlc29sdmUgaGVyZS5cbk9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgVXRpbHMsIEFwaUNsaWVudCwgU3RhdGUpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVdBLFdBQVMsY0FBYyxNQUFNO0FBQzNCLFdBQU8sS0FDSixLQUFLLEVBQ0wsUUFBUSxRQUFRLEdBQUcsRUFDbkIsS0FBSztBQUFBLEVBQ1Y7QUFNQSxXQUFTLFFBQVEsSUFBSTtBQUNuQixVQUFNLE9BQU8sSUFBSSxLQUFLLEtBQUssR0FBSTtBQUMvQixXQUFPLEtBQUssbUJBQW1CLFNBQVMsRUFBRSxPQUFPLFNBQVMsS0FBSyxXQUFXLE1BQU0sVUFBVSxDQUFDO0FBQUEsRUFDN0Y7QUFVQSxXQUFTLGtCQUFrQixNQUFNO0FBQy9CLFFBQUksVUFBVTtBQUVkLGNBQVUsUUFBUSxRQUFRLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxZQUFZLEVBQUU7QUFFcEUsY0FBVSxRQUFRLFFBQVEsWUFBWSxFQUFFLEVBQUUsUUFBUSxZQUFZLEVBQUU7QUFDaEUsV0FBTyxRQUFRLEtBQUs7QUFBQSxFQUN0QjtBQU1BLFdBQVMsV0FBVyxNQUFNO0FBQ3hCLFVBQU0sTUFBTTtBQUFBLE1BQ1YsS0FBSztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsS0FB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
