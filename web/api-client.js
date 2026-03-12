/**
 * api-client.js
 * Centralized HTTP communication layer. All API calls go through apiCall().
 * Provides error handling, logging, and retry logic.
 */

/**
 * Centralized localStorage key management to avoid duplication
 */
const StorageKeys = {
  SESSION_ID: 'cv-builder-session-id',
  TAB_DATA: 'cv-builder-tab-data',
  CURRENT_TAB: 'cv-builder-current-tab',
  CHAT_COLLAPSED: 'cv-builder-chat-collapsed'
};

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
    const response = await fetch(endpoint, options);

    // Handle 409 Conflict (session already active)
    if (response.status === 409) {
      console.warn(`Session conflict on ${endpoint}`);
      throw new Error('Session already active in another tab');
    }

    if (!response.ok) {
      console.error(`API error on ${method} ${endpoint}:`, response.status, response.statusText);
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
    console.error(`API call failed: ${method} ${endpoint}`, error);
    throw error;
  }
}

// ====================
// Session Management
// ====================

async function loadSession(sessionId) {
  return apiCall('GET', `/api/load-session?id=${encodeURIComponent(sessionId)}`);
}

async function deleteSession(sessionId) {
  return apiCall('POST', '/api/delete-session', { session_id: sessionId });
}

async function fetchStatus() {
  return apiCall('GET', '/api/status');
}

async function fetchHistory() {
  return apiCall('GET', '/api/history');
}

async function saveSession() {
  return apiCall('POST', '/api/save');
}

async function resetSession() {
  return apiCall('POST', '/api/reset');
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
