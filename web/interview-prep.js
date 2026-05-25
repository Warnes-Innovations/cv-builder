// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/interview-prep.js
 * Interview Preparation phase — placeholder content with navigation.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   handleStepClick
 */

import { getLogger } from './logger.js';
const log = getLogger('interview-prep');

async function populateInterviewPrepTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div style="max-width:700px;margin:0 auto;padding:40px 20px;text-align:center;">
      <div style="font-size:3em;margin-bottom:16px;">🎤</div>
      <h2 style="margin-bottom:12px;">Interview Preparation</h2>
      <p style="color:#6b7280;margin-bottom:8px;">
        AI-generated interview preparation based on this job and your CV is coming soon.
      </p>
      <p style="color:#6b7280;font-size:0.9em;">
        This will include likely interview questions, suggested talking points, and
        STAR-format answers drawn from your experience.
      </p>
      <div style="margin-top:40px;">
        <button class="btn-primary" onclick="handleStepClick('thank_you')"
                style="font-size:1em;padding:10px 24px;">
          Proceed to Thank You Letter →
        </button>
      </div>
    </div>`;

  log.debug('Interview prep placeholder rendered');
}

export { populateInterviewPrepTab };
