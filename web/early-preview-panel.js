// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/early-preview-panel.js
 * GAP-16 Part B: a persistent, collapsible CV preview shown during the
 * customization/rewrite/spell-check pipeline, so the user sees a rendered
 * CV well before Layout Review.
 *
 * SAFETY BOUNDARY (do not weaken without re-reading the GAP-16 plan's
 * committee-review section on this module): this file must only ever call
 * the read-only GET /api/layout-html endpoint. It must never call
 * POST /api/cv/generate-preview or POST /api/cv/smart-instruction — both
 * mutate generation_state (stateManager.markPreviewGenerated() forcibly
 * advances the workflow phase to LAYOUT_REVIEW), which would silently
 * fast-forward the user's stage while they're still on an earlier tab.
 * The rendering step is delegated to preview-render.js, a shared util with
 * no reference to apiCall/stateManager at all, specifically so a future
 * edit to the mutating layout-review flow cannot pull the mutating path in
 * here via a shared import.
 */

import { apiCall, StorageKeys } from './api-client.js';
import { stateManager } from './state-manager.js';
import { renderHtmlIntoIframe } from './preview-render.js';

const EARLY_PREVIEW_TABS = new Set([
  'exp-review', 'ach-editor', 'skills-review', 'achievements-review',
  'tagline-review', 'summary-review', 'publications-review', // customizations
  'rewrite', 'spell',
]);

let _collapsed = false;
try {
  _collapsed = localStorage.getItem(StorageKeys.EARLY_PREVIEW_COLLAPSED) === 'true';
} catch (_e) {
  // localStorage unavailable — default to expanded.
}

function _setCollapsed(collapsed) {
  _collapsed = collapsed;
  try {
    localStorage.setItem(StorageKeys.EARLY_PREVIEW_COLLAPSED, String(collapsed));
  } catch (_e) {
    // Non-fatal — collapse state just won't persist across reloads.
  }
  const btn = document.getElementById('early-preview-toggle-btn');
  if (btn) {
    btn.textContent = collapsed ? 'Show' : 'Hide';
    btn.setAttribute('aria-expanded', String(!collapsed));
  }
}

async function _renderEarlyPreviewBody() {
  const body = document.getElementById('early-preview-body');
  const note = document.getElementById('early-preview-status-note');
  if (!body) return;

  if (_collapsed) {
    body.style.display = 'none';
    return;
  }
  body.style.display = '';

  let data;
  try {
    // Read-only fetch only — see the module-header safety boundary.
    data = await apiCall('GET', '/api/layout-html');
  } catch (_e) {
    // 404/error (no preview generated yet this session) — empty state below.
    data = null;
  }

  if (data && data.ok && data.html) {
    const freshness = (typeof stateManager?.getLayoutFreshness === 'function')
      ? stateManager.getLayoutFreshness() : { isStale: false };

    body.innerHTML = '<iframe id="early-preview-iframe" sandbox="allow-same-origin" ' +
      'referrerpolicy="no-referrer" style="width:100%;height:100%;border:none;"></iframe>';
    const iframe = document.getElementById('early-preview-iframe');
    const stateLabel = freshness.isStale ? 'stale' : 'fresh';
    iframe.title = `CV preview — ${stateLabel}`;
    iframe.classList.toggle('early-preview-iframe-stale', Boolean(freshness.isStale));
    renderHtmlIntoIframe(iframe, data.html);

    if (note) {
      note.textContent = freshness.isStale
        ? 'Preview reflects an earlier version — visit Layout Review to refresh.'
        : '';
    }
    return;
  }

  body.innerHTML = '<div class="early-preview-empty">No CV preview yet — available after you reach Layout Review.</div>';
  if (note) note.textContent = '';
}

/**
 * Show or hide the panel for the given tab, and (re)render its body when
 * shown. Called from switchTab() — this function's own in-scope check
 * decides visibility, so the caller doesn't need to know the tab list.
 * @param {string} tab
 */
async function toggleEarlyPreviewPanel(tab) {
  const panel = document.getElementById('early-preview-panel');
  if (!panel) return;
  if (!EARLY_PREVIEW_TABS.has(tab)) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  await _renderEarlyPreviewBody();
}

function initEarlyPreviewPanel() {
  const btn = document.getElementById('early-preview-toggle-btn');
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(!_collapsed));
  btn.textContent = _collapsed ? 'Show' : 'Hide';
  btn.addEventListener('click', () => {
    _setCollapsed(!_collapsed);
    _renderEarlyPreviewBody();
  });
}

export { initEarlyPreviewPanel, toggleEarlyPreviewPanel };
