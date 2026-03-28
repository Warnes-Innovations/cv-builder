// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * utils.js
 * Utility functions for text processing, formatting, and data manipulation.
 * No dependencies on DOM or complex state. Pure functions.
 */

/**
 * Normalize whitespace in text:
 * - Remove leading/trailing whitespace
 * - Collapse internal whitespace to single spaces
 */
function normalizeText(text) {
  return text
    .trim()  // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')  // Collapse internal whitespace
    .trim();
}

/**
 * Format a Unix timestamp as human-readable date string.
 * Example: 1709236800 → "Mar 1, 2024"
 */
function fmtDate(ts) {
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Clean JSON response by removing markdown code blocks.
 * Handles common patterns:
 * - ```json ... ```
 * - ```
 *   ...
 * ```
 */
function cleanJsonResponse(text) {
  let cleaned = text;
  // Remove ```json wrapper
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  // Remove ``` wrapper
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return cleaned.trim();
}

/**
 * Extract and parse the first valid JSON object embedded in free-form text.
 * Returns null when no complete parseable object is found.
 */
function extractFirstJsonObject(text) {
  if (text == null || typeof text !== 'string') return null;

  const cleaned = cleanJsonResponse(text);

  for (let start = 0; start < cleaned.length; start += 1) {
    if (cleaned[start] !== '{') continue;

    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let index = start; index < cleaned.length; index += 1) {
      const char = cleaned[index];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (char === '\\') {
          isEscaped = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char !== '}') continue;

      depth -= 1;
      if (depth !== 0) continue;

      const candidate = cleaned.slice(start, index + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        break;
      }
    }
  }

  return null;
}

/**
 * Escape HTML special characters to prevent injection.
 * Converts: & < > " '
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract title and company from job description text.
 * Patterns:
 * - "Title | Company"
 * - "Title at Company"
 * - First line containing "title", "position", "role", "architect", etc.
 */
function extractTitleAndCompanyFromJobText(jobText) {
  const lines = jobText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Look for patterns: "Title | Company" or "Title at Company"
  for (const line of lines) {
    if (line.includes('|')) {
      const [title, company] = line.split('|').map(s => s.trim());
      if (title && company) {
        return { title, company };
      }
    }
    if (line.toLowerCase().includes(' at ')) {
      const [title, company] = line.split(/\s+at\s+/i).map(s => s.trim());
      if (title && company) {
        return { title, company };
      }
    }
  }

  // Fallback: use first non-empty line as title
  const titleLine = lines[0];
  return {
    title: titleLine || 'Untitled Position',
    company: lines.find(l => l.toLowerCase() !== titleLine.toLowerCase()) || 'Unknown Company'
  };
}

/**
 * Normalize position label:
 * - Capitalize each word
 * - Remove trailing "role", "position", "title", "job"
 * Examples:
 * - "senior data scientist" → "Senior Data Scientist"
 * - "director of engineering" → "Director of Engineering"
 */
function normalizePositionLabel(title, company) {
  let normalized = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Remove common suffixes
  normalized = normalized
    .replace(/\s+(role|position|title|job)\s*$/i, '')
    .trim();

  return normalized || 'Professional Role';
}

/**
 * Strip HTML tags from string.
 * Uses an inert template element, then removes executable/non-visible nodes.
 */
function stripHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html ?? '');
  template.content.querySelectorAll('script, style, noscript, template').forEach(node => node.remove());
  return template.content.textContent || '';
}

/**
 * Truncate text to max length with ellipsis.
 * Preserves word boundaries when possible.
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;

  // Truncate at max length
  let truncated = text.substring(0, maxLength);

  // Try to find the last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > Math.floor(maxLength * 0.75)) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + '…';
}

/**
 * Capitalize first letter of each word.
 */
function capitalizeWords(text) {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Conditional pluralization helper.
 * Example: pluralize(1, 'item', 'items') → 'item'
 *          pluralize(3, 'item', 'items') → 'items'
 */
function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

/**
 * Human-readable time duration.
 * Example: 5000 → "5 seconds", 65000 → "1 minute"
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Ordinal number suffix.
 * Example: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"
 */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Utility functions for session management and formatting

// Full-length phase labels — used by workflow step display, status text, etc.
const SESSION_PHASE_LABELS = {
  init:           'init',
  job_analysis:   'analysis',
  customization:  'customization',
  rewrite_review: 'rewrite',
  spell_check:    'spell check',
  generation:     'generation',
  layout_review:  'layout review',
  refinement:     'finalise',
};

// Abbreviated phase labels — used by the compact session-switcher UI.
// Intentionally separate from SESSION_PHASE_LABELS: the two sets serve different
// UI contexts (space-constrained header chip vs. full workflow step label).
const SESSION_PHASE_LABELS_SHORT = {
  init:           'Init',
  job_analysis:   'Analysis',
  customization:  'Custom',
  rewrite_review: 'Rewrite',
  spell_check:    'Spell',
  generation:     'Generate',
  layout_review:  'Layout',
  refinement:     'Done',
};

/**
 * Format session phase labels (full form).
 * @param {string} phase - The phase string to format.
 * @returns {string} - The formatted phase label.
 */
function formatSessionPhaseLabel(phase) {
  if (!phase) return 'init';
  return SESSION_PHASE_LABELS[phase] || String(phase).replace(/_/g, ' ');
}

/**
 * Format session timestamps.
 * @param {string} timestamp - The timestamp to format.
 * @param {object} options - Formatting options.
 * @param {boolean} [options.includeTime=true] - Whether to include time in the output.
 * @returns {string} - The formatted timestamp.
 */
function formatSessionTimestamp(timestamp, { includeTime = true } = {}) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
  } catch (_) {
    return String(timestamp).replace('T', ' ').slice(0, includeTime ? 16 : 10);
  }
}

// Structured logging helper (global and test-friendly).
const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const DEFAULT_LOG_LEVEL = 'info';

function createLogEntry(level, message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: String(message),
    ...metadata,
  };
  return entry;
}

const logger = {
  level: DEFAULT_LOG_LEVEL,

  setLevel(newLevel) {
    if (LOG_LEVELS[newLevel] != null) {
      this.level = newLevel;
    }
  },

  shouldLog(level) {
    if (LOG_LEVELS[level] == null) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  },

  log(level, message, metadata = {}) {
    if (!this.shouldLog(level)) return null;

    const entry = createLogEntry(level, message, metadata);
    const formatted = JSON.stringify(entry);

    if (typeof console !== 'undefined') {
      if (level === 'error') console.error(formatted);
      else if (level === 'warn') console.warn(formatted);
      else console.log(formatted);
    }

    return entry;
  },

  debug(message, metadata = {}) { return this.log('debug', message, metadata); },
  info(message, metadata = {}) { return this.log('info', message, metadata); },
  warn(message, metadata = {}) { return this.log('warn', message, metadata); },
  error(message, metadata = {}) { return this.log('error', message, metadata); },

  event(action, metadata = {}) {
    return this.info(`event:${action}`, { action, ...metadata });
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.logger = logger;
}

export {
  normalizeText, fmtDate, cleanJsonResponse, extractFirstJsonObject, escapeHtml,
  extractTitleAndCompanyFromJobText, normalizePositionLabel,
  stripHtml, truncateText, capitalizeWords, pluralize,
  formatDuration, ordinal,
  SESSION_PHASE_LABELS, SESSION_PHASE_LABELS_SHORT,
  formatSessionPhaseLabel, formatSessionTimestamp,
  logger,
};
