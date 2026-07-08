// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/thank-you.js
 * Thank You Letter phase — placeholder content with navigation.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   handleStepClick
 */

import { getLogger } from './logger.js';
const log = getLogger('thank-you');

async function populateThankYouTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div style="max-width:700px;margin:0 auto;padding:40px 20px;text-align:center;">
      <div style="font-size:3em;margin-bottom:16px;">🙏</div>
      <h2 style="margin-bottom:12px;">Thank You Letter</h2>
      <p style="color:#6b7280;margin-bottom:8px;">
        AI-generated thank you letter templates are coming soon.
      </p>
      <p style="color:#6b7280;font-size:0.9em;">
        After your interview, use this to generate a personalised thank you note
        that reinforces your fit for the role.
      </p>
      <div style="margin-top:40px;">
        <button class="btn-primary" onclick="handleStepClick('harvest')"
                style="font-size:1em;padding:10px 24px;">
          Proceed to Update Master CV →
        </button>
      </div>
    </div>`;

  log.debug('Thank you letter placeholder rendered');
}

export { populateThankYouTab };
