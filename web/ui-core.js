/**
 * ui-core.js
 * Core UI routing, tab management, modal management, and page initialization.
 * Entry point for the application - loads on DOMContentLoaded.
 */

// Reference StorageKeys from api-client.js (loaded first)
// Fallback values if api-client.js not loaded yet
const StorageKeys = {
  SESSION_ID: 'cv-builder-session-id',
  TAB_DATA: 'cv-builder-tab-data',
  CURRENT_TAB: 'cv-builder-current-tab',
  CHAT_COLLAPSED: 'cv-builder-chat-collapsed'
};

/**
 * Global fetch interceptor — shows amber banner on 409 Conflict (session already active).
 */
(function() {
  const _origFetch = window.fetch;
  window.fetch = async function(...args) {
    const resp = await _origFetch.apply(this, args);
    if (resp.status === 409) {
      showSessionConflictBanner();
    }
    return resp;
  };
})();

/**
 * Initialize the application on DOM ready.
 * Sets up event listeners, restores session, and loads initial tab.
 */
async function initialize() {
  try {
    // Initialize state
    if (typeof initializeState === 'function') {
      initializeState();
    }

    // Try to restore prior session
    if (typeof restoreSession === 'function') {
      await restoreSession();
    }

    // Set up event listeners
    setupEventListeners();

    // Restore tab data from localStorage
    if (typeof loadStateFromLocalStorage === 'function') {
      loadStateFromLocalStorage();
    }

    // Load initial tab content
    const savedTab = localStorage.getItem(StorageKeys.CURRENT_TAB) || 'job';
    switchTab(savedTab);

    console.log('✅ Application initialized');
  } catch (error) {
    console.error('Initialization error:', error);
    appendMessage('system', `⚠️ Failed to initialize: ${error.message}`);
  }
}

/**
 * Set up all global event listeners.
 */
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.id.replace('tab-', '');
      switchTab(tabName);
    });
  });

  // Message input (Enter key to send)
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (typeof sendMessage === 'function') {
          sendMessage();
        }
      }
    });
  }

  // Chat toggle button
  const toggleBtn = document.querySelector('.toggle-chat');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleChat);
  }

  // Modal close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Close modals on background click
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

/**
 * Switch to a specific tab and load its content.
 * @param {string} tab - Tab name (job, analysis, customizations, cv, download)
 */
function switchTab(tab) {
  // Update active tab button
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.getElementById(`tab-${tab}`);
  if (tabBtn) {
    tabBtn.classList.add('active');
  }

  // Update current tab state via stateManager
  try {
    if (typeof stateManager !== 'undefined' && stateManager.setCurrentTab) {
      stateManager.setCurrentTab(tab);
    } else {
      // Fallback: direct localStorage if stateManager not available
      localStorage.setItem(StorageKeys.CURRENT_TAB, tab);
    }
  } catch (e) {
    console.warn('Could not save current tab to localStorage');
  }

  // Adjust layout for CV tab (paper-sized) vs. others (full-width)
  const content = document.getElementById('document-content');
  if (content) {
    content.classList.toggle('full-width', tab !== 'cv');
  }

  // Load content for the tab
  loadTabContent(tab);
}

/**
 * Load content for a specific tab.
 * Routes to appropriate rendering function based on tab.
 * @param {string} tab - Tab name
 */
async function loadTabContent(tab) {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = ''; // Clear previous content

  try {
    switch (tab) {
      case 'job':
        if (typeof populateJobTab === 'function') {
          await populateJobTab();
        }
        break;

      case 'analysis':
        if (typeof populateAnalysisTab === 'function' && tabData.analysis) {
          populateAnalysisTab(tabData.analysis);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">No analysis data yet. Submit a job description to begin.</p>';
        }
        break;

      case 'customizations':
        if (typeof populateCustomizationsTab === 'function' && tabData.customizations) {
          populateCustomizationsTab(tabData.customizations);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Run analysis first to see customization recommendations.</p>';
        }
        break;

      case 'cv':
        if (typeof populateCVTab === 'function' && tabData.cv) {
          populateCVTab(tabData.cv);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV to see preview.</p>';
        }
        break;

      case 'download':
        if (typeof populateDownloadTab === 'function' && tabData.cv) {
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

/**
 * Toggle collapsible chat panel (interaction area).
 */
function toggleChat() {
  const interactionArea = document.querySelector('.interaction-area');
  const viewerArea = document.querySelector('.viewer-area');

  if (interactionArea) {
    const isCollapsed = interactionArea.classList.toggle('collapsed');
    if (viewerArea) {
      viewerArea.style.flex = isCollapsed ? '1 1 100%' : '0 1 60%';
    }
    try {
      localStorage.setItem(StorageKeys.CHAT_COLLAPSED, isCollapsed);
    } catch (e) {
      console.warn('Could not save chat state');
    }
  }
}

/**
 * Open a modal by ID.
 * @param {string} modalId - ID of modal element
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    // Lock body scroll
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close a modal by ID.
 * @param {string} modalId - ID of modal element
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    // Restore body scroll
    if (!document.querySelector('[role="dialog"].visible')) {
      document.body.style.overflow = '';
    }
  }
}

/**
 * Close all open modals.
 */
function closeAllModals() {
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = '';
}

/**
 * Show session conflict warning banner (multiple tabs active).
 */
function showSessionConflictBanner() {
  const banner = document.getElementById('session-conflict-banner');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Display an alert modal with title and message.
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 */
function showAlertModal(title, message) {
  const modal = document.getElementById('alert-modal');
  if (!modal) {
    // Create alert modal if it doesn't exist
    const newModal = document.createElement('div');
    newModal.id = 'alert-modal';
    newModal.setAttribute('role', 'dialog');
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

  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-message').innerHTML = message;
  openModal('alert-modal');
}

/**
 * Close the alert modal.
 */
function closeAlertModal() {
  closeModal('alert-modal');
}

/**
 * Route message responses to appropriate handlers based on workflow phase.
 * @param {string} phase - Current workflow phase
 * @param {object} response - Server response
 */
async function displayMessage(phase, response) {
  try {
    switch (phase) {
      case 'job_input':
        if (response.error) {
          appendMessage('system', `Error: ${response.error}`);
        } else if (response.job_analysis) {
          // Analysis ready
          tabData.analysis = response.job_analysis;
          appendMessage('assistant', `Analysis complete! I'll now show you the job analysis and post-analysis questions.`);
          switchTab('analysis');
          if (typeof populateAnalysisTab === 'function') {
            populateAnalysisTab(response.job_analysis);
          }
          if (typeof askPostAnalysisQuestions === 'function') {
            await askPostAnalysisQuestions(response.job_analysis);
          }
        }
        break;

      case 'customization_selection':
        if (response.customizations) {
          tabData.customizations = response.customizations;
          window.pendingRecommendations = response.customizations;
          switchTab('customizations');
          if (typeof populateCustomizationsTab === 'function') {
            populateCustomizationsTab(response.customizations);
          }
        }
        break;

      case 'rewrite_review':
        if (response.rewrites) {
          switchTab('rewrites');
          if (typeof fetchAndReviewRewrites === 'function') {
            await fetchAndReviewRewrites();
          }
        }
        break;

      case 'generation':
        if (response.generated_files) {
          tabData.cv = response.generated_files;
          switchTab('download');
          if (typeof populateDownloadTab === 'function') {
            await populateDownloadTab(response.generated_files);
          }
        }
        break;

      default:
        // Regular conversation message
        if (response.message || response.response) {
          appendMessage('assistant', response.message || response.response);
        }
    }
  } catch (error) {
    console.error('Error displaying message:', error);
    appendMessage('system', `Error processing response: ${error.message}`);
  }
}

/**
 * Update visual workflow indicator (progress bar, breadcrumb).
 * @param {object} status - Status object from server
 */
function updatePhaseIndicator(status) {
  if (!status.phase) return;

  const phases = ['job_input', 'analysis', 'customization', 'rewrite_review', 'generation', 'refinement'];
  const phaseIndex = phases.indexOf(status.phase);

  document.querySelectorAll('.step').forEach((step, idx) => {
    step.classList.remove('active', 'completed', 'upcoming');

    if (idx < phaseIndex) {
      step.classList.add('completed');
    } else if (idx === phaseIndex) {
      step.classList.add('active');
    } else {
      step.classList.add('upcoming');
    }
  });
}

/**
 * Enable/disable controls based on workflow state.
 * @param {boolean} enabled - True to enable controls
 */
function setControlsEnabled(enabled) {
  document.querySelectorAll('button, input, textarea').forEach(el => {
    el.disabled = !enabled;
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initialize);

// Also try immediate initialization for faster startup
if (document.readyState === 'loading') {
  // Document is still loading, wait for DOMContentLoaded
} else {
  // Document is already loaded
  initialize();
}
