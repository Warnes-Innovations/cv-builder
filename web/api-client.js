// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * api-client.js
 * Centralized HTTP communication layer. All API calls go through apiCall().
 * Provides error handling, logging, and retry logic.
 */

import { getLogger } from './logger.js';
const log = getLogger('api-client');

/**
 * Centralized localStorage key management to avoid duplication
 */
const StorageKeys = {
  SESSION_ID:   'cv-builder-session-id',
  SESSION_PATH: 'cv-builder-session-path',
  TAB_DATA:     'cv-builder-tab-data',
  CURRENT_TAB:  'cv-builder-current-tab',
  CHAT_COLLAPSED: 'cv-builder-chat-collapsed'
};

const OWNER_TOKEN_KEY = 'cv-builder-owner-token';

function getSessionIdFromURL() {
  if (typeof window === 'undefined' || !window.location) return null;
  return new URLSearchParams(window.location.search).get('session');
}

function setSessionIdInURL(sessionId, { replace = false } = {}) {
  if (typeof window === 'undefined' || !window.location || !window.history || !sessionId) return;
  const url = new URL(window.location.href);
  url.searchParams.set('session', sessionId);
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
}

function getOwnerToken() {
  if (typeof sessionStorage === 'undefined') return null;
  let token = sessionStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      token = crypto.randomUUID();
    } else {
      token = `tab-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    }
    sessionStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

function getScopedTabDataStorageKey(sessionId = null) {
  const scopedSessionId = sessionId || getSessionIdFromURL();
  return scopedSessionId
    ? `${StorageKeys.TAB_DATA}-${scopedSessionId}`
    : StorageKeys.TAB_DATA;
}

function _isSessionManagementPath(pathname) {
  return pathname === '/api/sessions/new'
    || pathname === '/api/sessions/claim'
    || pathname === '/api/sessions/takeover';
}

function _buildSessionAwareRequest(input, init = {}) {
  if (typeof window === 'undefined' || !window.location) {
    return [input, init];
  }

  const url = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
  if (!url.pathname.startsWith('/api/')) {
    return [input, init];
  }

  const ownerToken = getOwnerToken();
  if (!url.searchParams.has('owner_token') && !_isSessionManagementPath(url.pathname) && ownerToken) {
    url.searchParams.set('owner_token', ownerToken);
  }

  const sessionId = getSessionIdFromURL();
  if (!sessionId) {
    return [url.toString(), init];
  }

  const method = (init.method || 'GET').toUpperCase();
  const nextInit = { ...init };
  const headers = new Headers(init.headers || {});

  if (!url.searchParams.has('session_id') && !_isSessionManagementPath(url.pathname)) {
    url.searchParams.set('session_id', sessionId);
  }

  const needsBodyContext = !['GET', 'HEAD'].includes(method);
  const body = nextInit.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isURLSearchParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
  const contentType = headers.get('Content-Type') || '';

  if (needsBodyContext && !isFormData && !isURLSearchParams) {
    let payload = {};
    if (typeof body === 'string' && body.trim()) {
      try {
        payload = JSON.parse(body);
      } catch (_) {
        return [url.toString(), nextInit];
      }
    } else if (body == null) {
      payload = {};
    } else if (typeof body === 'object') {
      payload = { ...body };
    }

    if (payload.session_id == null && !_isSessionManagementPath(url.pathname)) {
      payload.session_id = sessionId;
    }
    if (payload.owner_token == null && !_isSessionManagementPath(url.pathname)) {
      if (ownerToken) payload.owner_token = ownerToken;
    }

    nextInit.body = JSON.stringify(payload);
    if (!contentType) {
      headers.set('Content-Type', 'application/json');
    }
  }

  nextInit.headers = headers;
  return [url.toString(), nextInit];
}

const _nativeFetch = typeof window !== 'undefined' && typeof window.fetch === 'function'
  ? window.fetch.bind(window)
  : (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);

async function sessionAwareFetch(input, init = {}) {
  if (_nativeFetch == null) {
    throw new Error('fetch is not available');
  }
  const [nextInput, nextInit] = _buildSessionAwareRequest(input, init);
  return _nativeFetch(nextInput, nextInit);
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  window.fetch = sessionAwareFetch;
}

/**
 * Base API call function with error handling and logging.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - API endpoint (e.g., '/api/status')
 * @param {object} data - Request body data (for POST/PUT)
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await sessionAwareFetch(endpoint, options);

    // Handle 409 Conflict (session already active)
    if (response.status === 409) {
      log.warn(`Session conflict on ${endpoint}`);
      throw new Error('Session already active in another tab');
    }

    if (!response.ok) {
      log.error(`API error on ${method} ${endpoint}:`, response.status, response.statusText);
      let errorMessage = response.statusText;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson === 'object') {
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        }
      } catch (_) {
        // Fall back to status text when response is not JSON.
      }
      throw new Error(`${response.status}: ${errorMessage}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    log.error(`API call failed: ${method} ${endpoint}`, error);
    throw error;
  }
}

// ====================
// Session Management
// ====================

async function loadSession(sessionId) {
  return apiCall('GET', `/api/load-session?id=${encodeURIComponent(sessionId)}`);
}

async function createSession() {
  return apiCall('POST', '/api/sessions/new');
}

async function deleteSession(sessionId) {
  return apiCall('POST', '/api/delete-session', { session_id: sessionId });
}

async function fetchStatus() {
  const status = await apiCall('GET', '/api/status');

  // Keep provider/auth UI in sync whenever status is fetched.
  const provider = status?.llm_provider || null;
  if (provider) {
    globalThis.currentProvider = provider;
  }
  if (typeof globalThis.updateAuthBadge === 'function') {
    globalThis.updateAuthBadge(status?.copilot_auth || {}, provider);
  }

  return status;
}

async function fetchHistory() {
  return apiCall('GET', '/api/history');
}

async function saveSession() {
  return apiCall('POST', '/api/save');
}

// ====================
// Job Input & Loading
// ====================

async function uploadJobFile(formData) {
  // FormData doesn't work well with apiCall, use direct fetch but wrap error handling
  try {
    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      log.error(`API error on POST /api/upload-file:`, response.status, response.statusText);
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    log.error(`API call failed: POST /api/upload-file`, error);
    throw error;
  }
}

async function submitJobText(jobText) {
  return apiCall('POST', '/api/job', { job_description: jobText });
}

async function fetchJobFromUrl(url) {
  return apiCall('POST', '/api/fetch-job-url', { url });
}

async function loadJobFile(path) {
  return apiCall('GET', `/api/load-job-file?path=${encodeURIComponent(path)}`);
}

async function loadExistingItems() {
  return apiCall('GET', '/api/load-items');
}

// ====================
// Analysis
// ====================

async function analyzeJob() {
  return apiCall('POST', '/api/action', { action: 'analyze_job' });
}

async function askPostAnalysisQuestions(analysisData) {
  return apiCall('POST', '/api/post-analysis-questions', { analysis: analysisData });
}

async function submitPostAnalysisAnswers(answers) {
  return apiCall('POST', '/api/post-analysis-responses', { answers });
}

// ====================
// Messages & Conversation
// ====================

async function sendMessage(message) {
  return apiCall('POST', '/api/message', { message });
}

async function sendAction(action, data = {}) {
  return apiCall('POST', '/api/action', { action, ...data });
}

// ====================
// CV Data & Editing
// ====================

async function fetchCVData() {
  return apiCall('GET', '/api/cv-data');
}

async function updateCVData(cvData) {
  return apiCall('POST', '/api/cv-data', { cv_data: cvData });
}

async function updateExperience(experienceId, updates) {
  return apiCall('POST', '/api/experience-details', { id: experienceId, ...updates });
}

async function fetchExperienceDetails(experienceId) {
  return apiCall('GET', `/api/experience-details?id=${encodeURIComponent(experienceId)}`);
}

// ====================
// Recommendations & Customizations
// ====================

async function fetchPublicationRecommendations() {
  return apiCall('GET', '/api/publication-recommendations');
}

async function submitReviewDecisions(decisions) {
  return apiCall('POST', '/api/review-decisions', decisions);
}

async function fetchRewrites() {
  return apiCall('GET', '/api/rewrites');
}

async function approveRewrites(decisions) {
  return apiCall('POST', '/api/rewrites/approve', { decisions });
}

// ====================
// Generation & Download
// ====================

async function generateCV(options = {}) {
  const payload = {
    formats: options.formats || ['ats_docx', 'human_pdf', 'human_docx'],
    ...options
  };
  return apiCall('POST', '/api/generate', payload);
}

async function downloadFile(filename) {
  // Downloads bypass JSON parsing - return blob
  const response = await fetch(`/api/download/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  return response.blob();
}

// ====================
// Helper: Set Loading State
// ====================

function setLoading(isLoading) {
  let loadingElement = document.getElementById('loading-indicator');
  if (!loadingElement) {
    // Create loading indicator if it doesn't exist
    loadingElement = document.createElement('div');
    loadingElement.id = 'loading-indicator';
    loadingElement.style.display = 'none';
    document.body.appendChild(loadingElement);
  }
  loadingElement.style.display = isLoading ? 'block' : 'none';
}

export {
  StorageKeys,
  OWNER_TOKEN_KEY,
  apiCall,
  getSessionIdFromURL,
  setSessionIdInURL,
  getOwnerToken,
  getScopedTabDataStorageKey,
  sessionAwareFetch,
  loadSession, deleteSession, fetchStatus, fetchHistory,
  createSession,
  saveSession,
  uploadJobFile, submitJobText, fetchJobFromUrl, loadJobFile, loadExistingItems,
  analyzeJob, askPostAnalysisQuestions, submitPostAnalysisAnswers,
  sendMessage, sendAction,
  fetchCVData, updateCVData, updateExperience, fetchExperienceDetails,
  fetchPublicationRecommendations, submitReviewDecisions,
  fetchRewrites, approveRewrites,
  generateCV, downloadFile, setLoading,
};
