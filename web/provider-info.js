// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/provider-info.js — LLM provider display metadata client.
 *
 * Provider data is now the single source of truth in scripts/utils/provider_registry.py
 * and served by GET /api/providers. This module fetches and caches that data.
 *
 * All provider descriptions, URLs, and tier/privacy flags should be edited in
 * provider_registry.py rather than here.
 *
 * Server field names (snake_case, matching Python):
 *   free_tier   — whether a no-cost API entry tier is available
 *   confidential — whether the provider commits not to train on API request data
 *   note        — one-sentence plain-text description
 *   homepage    — provider landing page URL (null if not applicable)
 *   pricing_url — pricing / plans page URL (null if not applicable)
 *   privacy_url — privacy policy or data-use policy URL (null if not applicable)
 */

import { escapeHtml } from './utils.js';

/** @type {Record<string, object>|null} */
let _cache = null;

/**
 * Fetch provider display metadata from the server and cache it.
 * Safe to call multiple times — only one request is ever made.
 * @returns {Promise<Record<string, object>|null>}
 */
export async function loadProviderInfo() {
  if (_cache !== null) return _cache;
  try {
    const resp = await fetch('/api/providers');
    if (resp.ok) {
      const data = await resp.json();
      _cache = data.providers || {};
    }
  } catch {
    // Non-fatal: popovers simply won't appear.
  }
  return _cache;
}

/**
 * Return cached display info for a provider, or null if not loaded / unknown.
 * Call loadProviderInfo() first (e.g. in openModelModal).
 * @param {string} provider
 * @returns {object|null}
 */
export function getProviderInfo(provider) {
  return _cache ? (_cache[provider] || null) : null;
}

/**
 * Build the HTML content string for a provider info Bootstrap 5 popover.
 * Uses snake_case field names as returned by GET /api/providers.
 * @param {object} info - Provider info entry from getProviderInfo()
 * @returns {string} HTML string (safe to pass to BS5 Popover with sanitize:false)
 */
export function providerInfoPopoverContent(info) {
  const tierIcon  = info.free_tier    ? '&#10003; Free tier available'    : '&#10007; Paid only (no free API tier)';
  const privIcon  = info.confidential ? '&#128274; Data confidential'     : '&#9888;&#65039; Data may be reviewed/retained';
  const tierColor = info.free_tier    ? '#065f46' : '#92400e';
  const privColor = info.confidential ? '#1e40af' : '#92400e';

  const links = [
    info.homepage    ? `<a href="${escapeHtml(info.homepage)}"    target="_blank" rel="noopener noreferrer">Homepage</a>`           : '',
    info.pricing_url ? `<a href="${escapeHtml(info.pricing_url)}" target="_blank" rel="noopener noreferrer">Pricing &amp; plans</a>` : '',
    info.privacy_url ? `<a href="${escapeHtml(info.privacy_url)}" target="_blank" rel="noopener noreferrer">Privacy policy</a>`      : '',
  ].filter(Boolean);

  return '<div style="min-width:220px;max-width:300px;font-size:0.82em;line-height:1.5;">'
    + `<div style="margin-bottom:6px;"><span style="color:${tierColor};">${tierIcon}</span></div>`
    + `<div style="margin-bottom:8px;"><span style="color:${privColor};">${privIcon}</span></div>`
    + `<p style="margin:0 0 8px;color:#374151;">${escapeHtml(info.note)}</p>`
    + (links.length ? '<ul style="margin:0;padding-left:16px;">' + links.map(l => `<li>${l}</li>`).join('') + '</ul>' : '')
    + '</div>';
}
