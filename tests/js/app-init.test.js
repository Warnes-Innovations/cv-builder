// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/app-init.test.js
 * Smoke tests for the M28 orchestrator boundary: verifies that all 27 split
 * modules export the key entry-point functions expected by main.js and that
 * the globalThis surface is complete after a simulated bundle load.
 *
 * These tests intentionally do NOT test business logic (that lives in the
 * per-module test files). They test:
 *   1. Every important named export exists and is a function.
 *   2. The globalThis assignment pattern in main.js (simulated via Object.assign)
 *      produces a callable surface without errors.
 */

// ── Import each module's named exports ───────────────────────────────────────

import * as Validators            from '../../web/validators.js'
import * as RecommendationHelpers from '../../web/recommendation-helpers.js'
import * as UiHelpers             from '../../web/ui-helpers.js'
import * as FetchUtils            from '../../web/fetch-utils.js'
import * as MessageQueue          from '../../web/message-queue.js'
import * as AuthProvider          from '../../web/auth-provider.js'
import * as AtsRefinement         from '../../web/ats-refinement.js'
import * as SessionActions        from '../../web/session-actions.js'
import * as JobAnalysis           from '../../web/job-analysis.js'
import * as SessionManager        from '../../web/session-manager.js'
import * as JobInput              from '../../web/job-input.js'
import * as MessageDispatch       from '../../web/message-dispatch.js'
import * as QuestionsPanel        from '../../web/questions-panel.js'
import * as ReviewTableBase       from '../../web/review-table-base.js'
import * as ExperienceReview      from '../../web/experience-review.js'
import * as SkillsReview          from '../../web/skills-review.js'
import * as AchievementsReview    from '../../web/achievements-review.js'
import * as SummaryReview         from '../../web/summary-review.js'
import * as PublicationsReview    from '../../web/publications-review.js'
import * as RewriteReview         from '../../web/rewrite-review.js'
import * as SpellCheck            from '../../web/spell-check.js'
import * as WorkflowSteps         from '../../web/workflow-steps.js'
import * as MasterCv              from '../../web/master-cv.js'
import * as CoverLetter           from '../../web/cover-letter.js'
import * as ScreeningQuestions    from '../../web/screening-questions.js'
import * as Finalise              from '../../web/finalise.js'
import * as SessionSwitcherUi     from '../../web/session-switcher-ui.js'

// ── Global stubs required by module-level code ────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('CSS', { escape: s => s })
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Helper: check all exports in a namespace are non-null ─────────────────────

function assertAllExports(ns, name) {
  const keys = Object.keys(ns)
  expect(keys.length, `${name} should export at least one symbol`).toBeGreaterThan(0)
  for (const k of keys) {
    // Skip legitimately-null module-level state (e.g. _pendingUploadFile = null)
    if (ns[k] === null) continue
    expect(ns[k], `${name}.${k} should not be undefined`).not.toBeUndefined()
  }
}

// ── Module surface smoke tests ────────────────────────────────────────────────

describe('Tier 0 — Validators', () => {
  it('exports at least one symbol', () => assertAllExports(Validators, 'Validators'))
  it('exports parseStatusResponse as a function', () => {
    expect(typeof Validators.parseStatusResponse).toBe('function')
  })
})

describe('Tier 0 — RecommendationHelpers', () => {
  it('exports at least one symbol', () => assertAllExports(RecommendationHelpers, 'RecommendationHelpers'))
})

describe('Tier 0 — UiHelpers', () => {
  it('exports at least one symbol', () => assertAllExports(UiHelpers, 'UiHelpers'))
  it('exports escapeHtml or a UI helper', () => {
    const fns = Object.values(UiHelpers).filter(v => typeof v === 'function')
    expect(fns.length).toBeGreaterThan(0)
  })
})

describe('Tier 1 — FetchUtils', () => {
  it('exports at least one symbol', () => assertAllExports(FetchUtils, 'FetchUtils'))
  it('exports llmFetch', () => {
    expect(typeof FetchUtils.llmFetch).toBe('function')
  })
})

describe('Tier 1 — MessageQueue', () => {
  it('exports at least one symbol', () => assertAllExports(MessageQueue, 'MessageQueue'))
})

describe('Tier 2 — AuthProvider', () => {
  it('exports at least one symbol', () => assertAllExports(AuthProvider, 'AuthProvider'))
})

describe('Tier 2 — AtsRefinement', () => {
  it('exports at least one symbol', () => assertAllExports(AtsRefinement, 'AtsRefinement'))
  it('exports updateAtsBadge', () => {
    expect(typeof AtsRefinement.updateAtsBadge).toBe('function')
  })
})

describe('Tier 2 — SessionActions', () => {
  it('exports at least one symbol', () => assertAllExports(SessionActions, 'SessionActions'))
  it('exports sendAction', () => {
    expect(typeof SessionActions.sendAction).toBe('function')
  })
})

describe('Tier 2 — JobAnalysis', () => {
  it('exports at least one symbol', () => assertAllExports(JobAnalysis, 'JobAnalysis'))
  it('exports analyzeJob', () => {
    expect(typeof JobAnalysis.analyzeJob).toBe('function')
  })
})

describe('Tier 3 — SessionManager', () => {
  it('exports at least one symbol', () => assertAllExports(SessionManager, 'SessionManager'))
  it('exports restoreSession', () => {
    expect(typeof SessionManager.restoreSession).toBe('function')
  })
})

describe('Tier 3 — JobInput', () => {
  it('exports at least one symbol', () => assertAllExports(JobInput, 'JobInput'))
  it('exports populateJobTab', () => {
    expect(typeof JobInput.populateJobTab).toBe('function')
  })
})

describe('Tier 3 — MessageDispatch', () => {
  it('exports at least one symbol', () => assertAllExports(MessageDispatch, 'MessageDispatch'))
  it('exports sendMessage', () => {
    expect(typeof MessageDispatch.sendMessage).toBe('function')
  })
})

describe('Tier 3 — QuestionsPanel', () => {
  it('exports at least one symbol', () => assertAllExports(QuestionsPanel, 'QuestionsPanel'))
  it('exports populateQuestionsTab', () => {
    expect(typeof QuestionsPanel.populateQuestionsTab).toBe('function')
  })
})

describe('Tier 4 — ReviewTableBase', () => {
  it('exports at least one symbol', () => assertAllExports(ReviewTableBase, 'ReviewTableBase'))
  it('exports populateReviewTab', () => {
    expect(typeof ReviewTableBase.populateReviewTab).toBe('function')
  })
})

describe('Tier 5 — ExperienceReview', () => {
  it('exports buildExperienceReviewTable', () => {
    expect(typeof ExperienceReview.buildExperienceReviewTable).toBe('function')
  })
})

describe('Tier 5 — SkillsReview', () => {
  it('exports buildSkillsReviewTable', () => {
    expect(typeof SkillsReview.buildSkillsReviewTable).toBe('function')
  })
})

describe('Tier 5 — AchievementsReview', () => {
  it('exports buildAchievementsReviewTable', () => {
    expect(typeof AchievementsReview.buildAchievementsReviewTable).toBe('function')
  })
})

describe('Tier 5 — SummaryReview', () => {
  it('exports buildSummaryFocusSection', () => {
    expect(typeof SummaryReview.buildSummaryFocusSection).toBe('function')
  })
})

describe('Tier 5 — PublicationsReview', () => {
  it('exports buildPublicationsReviewTable', () => {
    expect(typeof PublicationsReview.buildPublicationsReviewTable).toBe('function')
  })
})

describe('Tier 6 — RewriteReview', () => {
  it('exports fetchAndReviewRewrites', () => {
    expect(typeof RewriteReview.fetchAndReviewRewrites).toBe('function')
  })
  it('exports computeWordDiff', () => {
    expect(typeof RewriteReview.computeWordDiff).toBe('function')
  })
})

describe('Tier 6 — SpellCheck', () => {
  it('exports populateSpellCheckTab', () => {
    expect(typeof SpellCheck.populateSpellCheckTab).toBe('function')
  })
})

describe('Tier 6 — WorkflowSteps', () => {
  it('exports updateWorkflowSteps', () => {
    expect(typeof WorkflowSteps.updateWorkflowSteps).toBe('function')
  })
  it('exports _STEP_ORDER as an array', () => {
    expect(Array.isArray(WorkflowSteps._STEP_ORDER)).toBe(true)
    expect(WorkflowSteps._STEP_ORDER.length).toBeGreaterThan(0)
  })
})

describe('Tier 6 — MasterCv', () => {
  it('exports populateMasterTab', () => {
    expect(typeof MasterCv.populateMasterTab).toBe('function')
  })
})

describe('Tier 6 — CoverLetter', () => {
  it('exports populateCoverLetterTab', () => {
    expect(typeof CoverLetter.populateCoverLetterTab).toBe('function')
  })
  it('exports COVER_LETTER_TONES as an array', () => {
    expect(Array.isArray(CoverLetter.COVER_LETTER_TONES)).toBe(true)
  })
})

describe('Tier 6 — ScreeningQuestions', () => {
  it('exports populateScreeningTab', () => {
    expect(typeof ScreeningQuestions.populateScreeningTab).toBe('function')
  })
})

describe('Tier 6 — Finalise', () => {
  it('exports finaliseApplication', () => {
    expect(typeof Finalise.finaliseApplication).toBe('function')
  })
  it('exports applyHarvestSelections', () => {
    expect(typeof Finalise.applyHarvestSelections).toBe('function')
  })
})

describe('Tier 7 — SessionSwitcherUi', () => {
  it('exports openSessionsModal', () => {
    expect(typeof SessionSwitcherUi.openSessionsModal).toBe('function')
  })
  it('exports showSessionConflictBanner', () => {
    expect(typeof SessionSwitcherUi.showSessionConflictBanner).toBe('function')
  })
  it('exports conflictRetryNow and conflictDismiss', () => {
    expect(typeof SessionSwitcherUi.conflictRetryNow).toBe('function')
    expect(typeof SessionSwitcherUi.conflictDismiss).toBe('function')
  })
})

// ── globalThis surface simulation (main.js Object.assign pattern) ─────────────

describe('main.js globalThis assignment', () => {
  it('Object.assign of all modules does not throw', () => {
    expect(() => {
      Object.assign({},
        Validators, RecommendationHelpers, UiHelpers,
        FetchUtils, MessageQueue,
        AuthProvider, AtsRefinement, SessionActions, JobAnalysis,
        SessionManager, JobInput, MessageDispatch, QuestionsPanel,
        ReviewTableBase,
        ExperienceReview, SkillsReview, AchievementsReview, SummaryReview, PublicationsReview,
        RewriteReview, SpellCheck, WorkflowSteps, MasterCv,
        CoverLetter, ScreeningQuestions, Finalise,
        SessionSwitcherUi,
      )
    }).not.toThrow()
  })

  it('merged surface has expected key entry points', () => {
    const merged = Object.assign({},
      Validators, RecommendationHelpers, UiHelpers,
      FetchUtils, MessageQueue,
      AuthProvider, AtsRefinement, SessionActions, JobAnalysis,
      SessionManager, JobInput, MessageDispatch, QuestionsPanel,
      ReviewTableBase,
      ExperienceReview, SkillsReview, AchievementsReview, SummaryReview, PublicationsReview,
      RewriteReview, SpellCheck, WorkflowSteps, MasterCv,
      CoverLetter, ScreeningQuestions, Finalise,
      SessionSwitcherUi,
    )
    const expected = [
      'parseStatusResponse',    // validators
      'llmFetch',               // fetch-utils
      'updateAtsBadge',         // ats-refinement
      'sendAction',             // session-actions
      'analyzeJob',             // job-analysis
      'restoreSession',         // session-manager
      'populateJobTab',         // job-input
      'sendMessage',            // message-dispatch
      'populateQuestionsTab',   // questions-panel
      'populateReviewTab',      // review-table-base
      'buildExperienceReviewTable', // experience-review
      'buildSkillsReviewTable', // skills-review
      'computeWordDiff',        // rewrite-review
      'populateSpellCheckTab',  // spell-check
      'updateWorkflowSteps',    // workflow-steps
      'populateMasterTab',      // master-cv
      'populateCoverLetterTab', // cover-letter
      'populateScreeningTab',   // screening-questions
      'finaliseApplication',    // finalise
      'openSessionsModal',      // session-switcher-ui
      'conflictRetryNow',       // session-switcher-ui
    ]
    for (const key of expected) {
      expect(merged, `merged surface should contain ${key}`).toHaveProperty(key)
      expect(typeof merged[key]).toBe('function')
    }
  })
})
