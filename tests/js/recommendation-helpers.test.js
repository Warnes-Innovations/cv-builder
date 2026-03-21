// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/recommendation-helpers.test.js
 * Unit tests for web/recommendation-helpers.js — pure lookup functions.
 */
import {
  getExperienceRecommendation, getConfidenceLevel, getExperienceReasoning,
  getSkillRecommendation, getSkillConfidence, getSkillReasoning,
  getAchievementRecommendation, getAchievementConfidence, getAchievementReasoning,
  buildFallbackPostAnalysisQuestions,
} from '../../web/recommendation-helpers.js'
import loglevel from '../../web/logger.js'

const log = loglevel.getLogger('recommendation-helpers')

// ── Experience recommendations ────────────────────────────────────────────

describe('getExperienceRecommendation', () => {
  it('returns rec.recommendation when present', () => {
    const data = { experience_recommendations: [{ id: 'e1', recommendation: 'Emphasize' }] }
    expect(getExperienceRecommendation('e1', data)).toBe('Emphasize')
  })

  it('falls back to omitted_experiences list', () => {
    const data = { experience_recommendations: [], omitted_experiences: ['e2'] }
    expect(getExperienceRecommendation('e2', data)).toBe('Omit')
  })

  it('falls back to recommended_experiences list', () => {
    const data = { experience_recommendations: [], recommended_experiences: ['e3'] }
    expect(getExperienceRecommendation('e3', data)).toBe('Emphasize')
  })

  it('defaults to Include when nothing matches', () => {
    const data = { experience_recommendations: [] }
    expect(getExperienceRecommendation('e99', data)).toBe('Include')
  })

  it('warns when experience_recommendations is absent', () => {
    const spy = vi.spyOn(log, 'warn').mockImplementation(() => {})
    getExperienceRecommendation('e1', {})
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('getConfidenceLevel', () => {
  it('parses "Very High Confidence"', () => {
    const data = { experience_recommendations: [{ id: 'e1', confidence: 'Very High Confidence' }] }
    expect(getConfidenceLevel('e1', data)).toEqual({ level: 'very-high', text: 'Very High Confidence' })
  })

  it('parses "Low Confidence"', () => {
    const data = { experience_recommendations: [{ id: 'e1', confidence: 'Low Confidence' }] }
    expect(getConfidenceLevel('e1', data)).toEqual({ level: 'low', text: 'Low Confidence' })
  })

  it('defaults to medium when no confidence present', () => {
    const data = { experience_recommendations: [{ id: 'e1' }] }
    expect(getConfidenceLevel('e1', data)).toEqual({ level: 'medium', text: 'Medium Confidence' })
  })

  it('defaults to medium when rec not found', () => {
    const data = { experience_recommendations: [] }
    expect(getConfidenceLevel('e99', data)).toEqual({ level: 'medium', text: 'Medium Confidence' })
  })
})

describe('getExperienceReasoning', () => {
  it('returns rec.reasoning when present', () => {
    const data = { experience_recommendations: [{ id: 'e1', reasoning: 'Strong match' }] }
    expect(getExperienceReasoning('e1', data)).toBe('Strong match')
  })

  it('returns default text when reasoning absent', () => {
    const data = { experience_recommendations: [] }
    expect(getExperienceReasoning('e1', data)).toMatch(/relevance/i)
  })
})

// ── Skill recommendations ─────────────────────────────────────────────────

describe('getSkillRecommendation', () => {
  it('returns rec.recommendation when present', () => {
    const data = { skill_recommendations: [{ skill: 'Python', recommendation: 'Include' }] }
    expect(getSkillRecommendation('Python', data)).toBe('Include')
  })

  it('falls back to recommended_skills list', () => {
    const data = { skill_recommendations: [], recommended_skills: ['R'] }
    expect(getSkillRecommendation('R', data)).toBe('Include')
  })

  it('defaults to Omit for unknown skills', () => {
    const data = { skill_recommendations: [], recommended_skills: [] }
    expect(getSkillRecommendation('COBOL', data)).toBe('Omit')
  })
})

describe('getSkillConfidence', () => {
  it('returns parsed confidence from rec', () => {
    const data = { skill_recommendations: [{ skill: 'Python', confidence: 'High' }] }
    expect(getSkillConfidence('Python', data)).toEqual({ level: 'high', text: 'High Confidence' })
  })

  it('returns medium for skills in recommended_skills without rec', () => {
    const data = { skill_recommendations: [], recommended_skills: ['SQL'] }
    expect(getSkillConfidence('SQL', data)).toEqual({ level: 'medium', text: 'Medium Confidence' })
  })

  it('returns low for unknown skills', () => {
    const data = { skill_recommendations: [], recommended_skills: [] }
    expect(getSkillConfidence('COBOL', data)).toEqual({ level: 'low', text: 'Low Confidence' })
  })
})

describe('getSkillReasoning', () => {
  it('returns rec.reasoning when present', () => {
    const data = { skill_recommendations: [{ skill: 'Python', reasoning: 'Core requirement' }] }
    expect(getSkillReasoning('Python', data)).toBe('Core requirement')
  })

  it('returns relevant-skills text for recommended skills', () => {
    const data = { skill_recommendations: [], recommended_skills: ['SQL'] }
    expect(getSkillReasoning('SQL', data)).toMatch(/relevant/i)
  })

  it('returns not-mentioned text for omitted skills', () => {
    const data = { skill_recommendations: [], recommended_skills: [] }
    expect(getSkillReasoning('COBOL', data)).toMatch(/not specifically mentioned/i)
  })
})

// ── Achievement recommendations ───────────────────────────────────────────

describe('getAchievementRecommendation', () => {
  it('returns rec.recommendation when present', () => {
    const data = { achievement_recommendations: [{ id: 'sa_001', recommendation: 'Include' }] }
    expect(getAchievementRecommendation('sa_001', data)).toBe('Include')
  })

  it('falls back to recommended_achievements list', () => {
    const data = { achievement_recommendations: [], recommended_achievements: ['sa_002'] }
    expect(getAchievementRecommendation('sa_002', data)).toBe('Include')
  })

  it('defaults to De-emphasize', () => {
    const data = { achievement_recommendations: [], recommended_achievements: [] }
    expect(getAchievementRecommendation('sa_999', data)).toBe('De-emphasize')
  })
})

describe('getAchievementConfidence', () => {
  it('parses confidence from rec', () => {
    const data = { achievement_recommendations: [{ id: 'sa_001', confidence: 'Very High' }] }
    expect(getAchievementConfidence('sa_001', data, 5)).toEqual({ level: 'very-high', text: 'Very High' })
  })

  it('derives from importance score when no rec', () => {
    const data = { achievement_recommendations: [] }
    expect(getAchievementConfidence('sa_001', data, 9).level).toBe('very-high')
    expect(getAchievementConfidence('sa_001', data, 7).level).toBe('high')
    expect(getAchievementConfidence('sa_001', data, 5).level).toBe('medium')
    expect(getAchievementConfidence('sa_001', data, 3).level).toBe('low')
    expect(getAchievementConfidence('sa_001', data, 1).level).toBe('very-low')
  })
})

describe('getAchievementReasoning', () => {
  it('returns rec.reasoning when present', () => {
    const data = { achievement_recommendations: [{ id: 'sa_001', reasoning: 'Highly relevant' }] }
    expect(getAchievementReasoning('sa_001', data, {})).toBe('Highly relevant')
  })

  it('includes relevant_for when available for recommended achievements', () => {
    const data = { achievement_recommendations: [], recommended_achievements: ['sa_001'] }
    const ach = { relevant_for: ['leadership', 'innovation'] }
    expect(getAchievementReasoning('sa_001', data, ach)).toMatch(/leadership/)
  })

  it('returns generic recommended text without relevant_for', () => {
    const data = { achievement_recommendations: [], recommended_achievements: ['sa_001'] }
    expect(getAchievementReasoning('sa_001', data, {})).toMatch(/recommended/i)
  })

  it('returns not-highlighted text for de-emphasised achievements', () => {
    const data = { achievement_recommendations: [], recommended_achievements: [] }
    expect(getAchievementReasoning('sa_001', data, {})).toMatch(/not specifically highlighted/i)
  })
})

// ── buildFallbackPostAnalysisQuestions ────────────────────────────────────

describe('buildFallbackPostAnalysisQuestions', () => {
  it('returns empty array for minimal data', () => {
    expect(buildFallbackPostAnalysisQuestions({})).toEqual([])
  })

  it('adds a question for role_level', () => {
    const qs = buildFallbackPostAnalysisQuestions({ role_level: 'senior' })
    expect(qs).toHaveLength(1)
    expect(qs[0].type).toBe('experience_level')
    expect(qs[0].choices).toHaveLength(3)
  })

  it('adds a leadership question when required_skills include leadership', () => {
    const qs = buildFallbackPostAnalysisQuestions({ required_skills: ['leadership', 'Python'] })
    expect(qs.some(q => q.type === 'leadership_focus')).toBe(true)
  })

  it('adds a domain question when domain is present', () => {
    const qs = buildFallbackPostAnalysisQuestions({ domain: 'pharma' })
    expect(qs.some(q => q.type === 'domain_expertise')).toBe(true)
  })

  it('adds a company question when company is present', () => {
    const qs = buildFallbackPostAnalysisQuestions({ company: 'Acme Corp' })
    expect(qs.some(q => q.type === 'company_culture')).toBe(true)
    expect(qs[0].question).toContain('Acme Corp')
  })

  it('can generate up to 4 questions for fully-populated data', () => {
    const qs = buildFallbackPostAnalysisQuestions({
      role_level: 'senior',
      required_skills: ['management'],
      domain: 'biotech',
      company: 'Genentech',
    })
    expect(qs).toHaveLength(4)
  })
})
