// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * Focused regression test for bullet-reorder fallback behavior.
 * Ensures the modal still opens when suggested-order fetch fails,
 * as long as experience-details is available.
 */

import { showBulletReorder } from '../../web/workflow-steps.js'

describe('showBulletReorder fallback behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = ''

    // Minimal globals used by app.js during function execution.
    globalThis.window = globalThis.window || {}
    window.postAnalysisQuestions = []
    window.questionAnswers = {}

    vi.spyOn(console, 'warn').mockImplementation(() => {})

    globalThis.escapeHtml = (s) => String(s)
    globalThis.appendRetryMessage = vi.fn()
    globalThis.appendMessage = vi.fn()

    // app.js references these in many paths; define safe stubs for load-time.
    globalThis.StorageKeys = {
      SESSION_ID: 'cv-builder-session-id',
      SESSION_PATH: 'cv-builder-session-path',
      TAB_DATA: 'cv-builder-tab-data',
      CURRENT_TAB: 'cv-builder-current-tab',
      CHAT_COLLAPSED: 'cv-builder-chat-collapsed',
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens bullet modal when suggested-order endpoint fails but details succeed', async () => {
    const fetchMock = vi.fn()
      // Required call succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          experience: {
            achievements: ['Shipped feature X', 'Reduced latency by 30%'],
          },
        }),
      })
      // Optional suggested-order call fails
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    vi.stubGlobal('fetch', fetchMock)

    await showBulletReorder('exp_001', 'Senior Engineer')

    const modal = document.getElementById('bullet-reorder-modal')
    expect(modal).not.toBeNull()
    expect(document.querySelectorAll('#bullet-reorder-list li')).toHaveLength(2)

    // No hard failure message should be emitted for optional endpoint failure.
    expect(globalThis.appendRetryMessage).not.toHaveBeenCalled()

    // Suggested-order button should be absent when optional data unavailable.
    expect(document.getElementById('use-llm-order-btn')).toBeNull()
  })

  it('prefers LLM-provided bullet order from pending recommendations', async () => {
    window.pendingRecommendations = {
      experience_recommendations: [{
        id: 'exp_001',
        bullet_order: {
          order: [1, 0],
          reasoning: 'Lead with the stronger impact bullet.',
          ats_impact: 'Puts the matching keyword earlier.',
          page_length_impact: 'none',
        },
      }],
    }

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experience: {
          achievements: ['Shipped feature X', 'Reduced latency by 30%'],
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await showBulletReorder('exp_001', 'Senior Engineer')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(document.getElementById('use-llm-order-btn')).not.toBeNull()
    expect(document.getElementById('bullet-order-ai-note').textContent).toContain('Lead with the stronger impact bullet.')
  })
})
