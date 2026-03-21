// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * Regression tests for populating structured post-analysis questions from
 * assistant analysis text when the backend response lacks them.
 */

describe('post-analysis question extraction', () => {
  let app
  let originalFetch

  function loadApp() {
    delete require.cache[require.resolve('../../web/app.js')]
    app = require('../../web/app.js')
    return app
  }

  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState({}, '', 'http://localhost/')
    sessionStorage.clear()
    originalFetch = globalThis.fetch
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock
    loadApp()
  })

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch
      window.fetch = originalFetch
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('extracts numbered clarifying questions from assistant analysis text', () => {
    const text = `This is an exceptional match for your background.\n\nTo tailor your CV for Genentech, I have a few specific clarifying questions:\n\n1. Positioning - Architect vs. Maintainer: This role emphasizes sustained impact and mastery over new projects. Given your recent CTO and Chief Scientist roles, do you want to position yourself as the "Foundational Expert" or the "Hands-on Architect"?\n\n2. Specific Technical Evidence: The JD explicitly asks for experience with OAuth2/JWT authentication and Cloud Object Storage. Should I highlight those specific technical patterns and integrations?\n\n3. The "Complex Problem" Selection: The recruiter asked for a description of a complex technical problem solved in a production system. Would you prefer to highlight the MiDAS Genomic Workflow at Pfizer or a more recent platform modernization example?`

    const questions = app.extractStructuredQuestionsFromAssistantText(text)

    expect(questions).toHaveLength(3)
    expect(questions.map(question => question.type)).toEqual([
      'clarification_1',
      'clarification_2',
      'clarification_3',
    ])
    expect(questions[0].question).toContain('Positioning - Architect vs. Maintainer')
    expect(questions[1].question).toContain('Specific Technical Evidence')
    expect(questions[2].question).toContain('Complex Problem')
  })

  it('returns no questions when the assistant text has no numbered list', () => {
    expect(
      app.extractStructuredQuestionsFromAssistantText(
        'Analysis complete. Click Recommend Customizations when ready.'
      )
    ).toEqual([])
  })
})