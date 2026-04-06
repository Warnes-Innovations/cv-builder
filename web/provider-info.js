// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/provider-info.js — Static metadata for LLM provider selector cards.
 *
 * Edit this file to update provider descriptions, URLs, and tier/privacy flags
 * without touching ui-core.js.
 *
 * Fields per entry:
 *   freeTier    — whether a no-cost API entry tier is available
 *   confidential — whether the provider commits not to train on API request data
 *   note        — one-sentence plain-text description
 *   homepage    — provider landing page URL (null if not applicable)
 *   pricingUrl  — pricing / plans page URL (null if not applicable)
 *   privacyUrl  — privacy policy or data-use policy URL (null if not applicable)
 */

import { escapeHtml } from './utils.js';

/** @type {Record<string, {freeTier: boolean, confidential: boolean, note: string, homepage: string|null, pricingUrl: string|null, privacyUrl: string|null}>} */
export const PROVIDER_INFO = {
  'github': {
    freeTier:     true,
    confidential: true,
    note:         'GitHub Models API powered by Azure AI. Free tier available (rate-limited). API requests are not used for model training.',
    homepage:     'https://github.com/marketplace/models',
    pricingUrl:   'https://github.com/features/models',
    privacyUrl:   'https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
  },
  'copilot': {
    freeTier:     false,
    confidential: true,
    note:         'GitHub Copilot — same Azure-hosted models as the github provider. Requires a paid Copilot Individual/Business subscription. API requests are not used for training.',
    homepage:     'https://github.com/features/copilot',
    pricingUrl:   'https://github.com/features/copilot#pricing',
    privacyUrl:   'https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
  },
  'copilot-oauth': {
    freeTier:     false,
    confidential: true,
    note:         'GitHub Copilot via browser OAuth — authenticates with your GitHub account. Requires an active Copilot subscription. No API key stored.',
    homepage:     'https://github.com/features/copilot',
    pricingUrl:   'https://github.com/features/copilot#pricing',
    privacyUrl:   'https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
  },
  'copilot-sdk': {
    freeTier:     false,
    confidential: true,
    note:         'GitHub Copilot via the GitHub CLI (gh auth login). Requires an active Copilot subscription. No separate API key needed.',
    homepage:     'https://cli.github.com/',
    pricingUrl:   'https://github.com/features/copilot#pricing',
    privacyUrl:   'https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
  },
  'openai': {
    freeTier:     false,
    confidential: true,
    note:         'OpenAI — creator of the GPT model family. Pay-as-you-go pricing; no free API tier. API data is not used for training by default per OpenAI API policy.',
    homepage:     'https://openai.com',
    pricingUrl:   'https://openai.com/api/pricing',
    privacyUrl:   'https://openai.com/policies/privacy-policy',
  },
  'anthropic': {
    freeTier:     false,
    confidential: true,
    note:         'Anthropic — creator of the Claude model family. Pay-as-you-go pricing; no free API tier. API requests are not used to train models.',
    homepage:     'https://anthropic.com',
    pricingUrl:   'https://www.anthropic.com/pricing',
    privacyUrl:   'https://www.anthropic.com/privacy',
  },
  'gemini': {
    freeTier:     true,
    confidential: false,
    note:         'Google Gemini — Google AI Studio / Vertex AI. Free tier available. Free-tier prompts may be reviewed by Google; paid Vertex AI offers full confidentiality.',
    homepage:     'https://ai.google.dev',
    pricingUrl:   'https://ai.google.dev/pricing',
    privacyUrl:   'https://policies.google.com/privacy',
  },
  'groq': {
    freeTier:     true,
    confidential: false,
    note:         'Groq — ultra-fast inference on open-source models (Llama, Mixtral) via custom LPU hardware. Generous free tier. Review Groq privacy policy for data retention details.',
    homepage:     'https://groq.com',
    pricingUrl:   'https://groq.com/pricing',
    privacyUrl:   'https://groq.com/privacy-policy',
  },
  'local': {
    freeTier:     true,
    confidential: true,
    note:         'Local model running entirely on your machine. No data leaves your device. Completely private. No API key or account required.',
    homepage:     null,
    pricingUrl:   null,
    privacyUrl:   null,
  },
};

/**
 * Build the HTML content string for a provider info Bootstrap 5 popover.
 * @param {typeof PROVIDER_INFO[string]} info - Provider info entry
 * @returns {string} HTML string (safe to pass to BS5 Popover with sanitize:false)
 */
export function providerInfoPopoverContent(info) {
  const tierIcon  = info.freeTier     ? '&#10003; Free tier available'    : '&#10007; Paid only (no free API tier)';
  const privIcon  = info.confidential ? '&#128274; Data confidential'     : '&#9888;&#65039; Data may be reviewed/retained';
  const tierColor = info.freeTier     ? '#065f46' : '#92400e';
  const privColor = info.confidential ? '#1e40af' : '#92400e';

  const links = [
    info.homepage   ? `<a href="${escapeHtml(info.homepage)}"   target="_blank" rel="noopener noreferrer">Homepage</a>`           : '',
    info.pricingUrl ? `<a href="${escapeHtml(info.pricingUrl)}" target="_blank" rel="noopener noreferrer">Pricing &amp; plans</a>` : '',
    info.privacyUrl ? `<a href="${escapeHtml(info.privacyUrl)}" target="_blank" rel="noopener noreferrer">Privacy policy</a>`      : '',
  ].filter(Boolean);

  return '<div style="min-width:220px;max-width:300px;font-size:0.82em;line-height:1.5;">'
    + `<div style="margin-bottom:6px;"><span style="color:${tierColor};">${tierIcon}</span></div>`
    + `<div style="margin-bottom:8px;"><span style="color:${privColor};">${privIcon}</span></div>`
    + `<p style="margin:0 0 8px;color:#374151;">${escapeHtml(info.note)}</p>`
    + (links.length ? '<ul style="margin:0;padding-left:16px;">' + links.map(l => `<li>${l}</li>`).join('') + '</ul>' : '')
    + '</div>';
}
