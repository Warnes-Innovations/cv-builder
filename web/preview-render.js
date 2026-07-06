// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/preview-render.js
 * Shared, side-effect-free helper for safely rendering CV HTML into a
 * sandboxed iframe. Deliberately has no reference to stateManager, apiCall,
 * or any fetch logic — it only touches the DOM — so it can be safely
 * imported by both the mutating layout-review flow (layout-instruction.js)
 * and the read-only early-preview panel (early-preview-panel.js) without
 * creating a shared import path back to any mutating endpoint.
 */

/**
 * Render an HTML string into an iframe via srcdoc, with the sandbox
 * attributes already established for CV previews elsewhere in the app.
 * @param {HTMLIFrameElement} iframeEl
 * @param {string} html
 */
function renderHtmlIntoIframe(iframeEl, html) {
  if (!iframeEl) return;
  iframeEl.setAttribute('sandbox', 'allow-same-origin');
  iframeEl.setAttribute('referrerpolicy', 'no-referrer');
  iframeEl.srcdoc = html;
}

export { renderHtmlIntoIframe };
