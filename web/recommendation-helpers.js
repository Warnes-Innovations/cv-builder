// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/recommendation-helpers.js
 * Pure helper functions for looking up LLM recommendation data from the
 * /api/status response object.  Supports experience, skill, and achievement
 * recommendations with backwards-compatible flat-list fallbacks for old
 * session data.
 *
 * DEPENDENCIES: none
 */

import { getLogger } from './logger.js';
const log = getLogger('recommendation-helpers');

// ---------------------------------------------------------------------------
// Internal lookup helpers
// ---------------------------------------------------------------------------

/** Look up a single experience entry in experience_recommendations. */
function _findExpRec(expId, data) {
  if (!Array.isArray(data.experience_recommendations)) {
    log.warn('[recommendation] experience_recommendations missing; using flat-list fallback for', expId);
    return null;
  }
  return data.experience_recommendations.find(r => r.id === expId || r.experience_id === expId) || null;
}

/** Look up a single skill entry in skill_recommendations. */
function _findSkillRec(skill, data) {
  if (!Array.isArray(data.skill_recommendations)) {
    log.warn('[recommendation] skill_recommendations missing; using flat-list fallback for', skill);
    return null;
  }
  return data.skill_recommendations.find(r => r.skill === skill || r.name === skill) || null;
}

/** Parse a raw confidence string to a {level, text} object, or null if unrecognised. */
function _parseConfidence(conf) {
  const c = (conf || '').toLowerCase();
  if (c.includes('very high')) return { level: 'very-high', text: 'Very High Confidence' };
  if (c.includes('very low'))  return { level: 'very-low',  text: 'Very Low Confidence'  };
  if (c.includes('high'))      return { level: 'high',      text: 'High Confidence'      };
  if (c.includes('medium'))    return { level: 'medium',    text: 'Medium Confidence'    };
  if (c.includes('low'))       return { level: 'low',       text: 'Low Confidence'       };
  return null;
}

// ---------------------------------------------------------------------------
// Experience recommendations
// ---------------------------------------------------------------------------

function getExperienceRecommendation(expId, data) {
  const rec = _findExpRec(expId, data);
  if (rec && rec.recommendation) return rec.recommendation;
  // Backwards-compat flat-list fallback
  if (data.omitted_experiences     && data.omitted_experiences.includes(expId))     return 'Omit';
  if (data.recommended_experiences && data.recommended_experiences.includes(expId)) return 'Emphasize';
  return 'Include';
}

function getConfidenceLevel(expId, data) {
  const rec = _findExpRec(expId, data);
  return (rec && _parseConfidence(rec.confidence)) || { level: 'medium', text: 'Medium Confidence' };
}

function getExperienceReasoning(expId, data) {
  const rec = _findExpRec(expId, data);
  return (rec && rec.reasoning) || 'This experience was selected based on its relevance to the position requirements.';
}

// ---------------------------------------------------------------------------
// Skill recommendations
// ---------------------------------------------------------------------------

function getSkillRecommendation(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec && rec.recommendation) return rec.recommendation;
  if (data.recommended_skills && data.recommended_skills.includes(skill)) return 'Include';
  return 'Omit';
}

function getSkillConfidence(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec) {
    const parsed = _parseConfidence(rec.confidence);
    if (parsed) return parsed;
  }
  if (data.recommended_skills && data.recommended_skills.includes(skill)) {
    return { level: 'medium', text: 'Medium Confidence' };
  }
  return { level: 'low', text: 'Low Confidence' };
}

function getSkillReasoning(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec && rec.reasoning) return rec.reasoning;
  if (data.recommended_skills && data.recommended_skills.includes(skill)) {
    return 'This skill was identified as relevant to the position requirements.';
  }
  return 'This skill was not specifically mentioned in the job requirements.';
}

// ---------------------------------------------------------------------------
// Achievement recommendations
// ---------------------------------------------------------------------------

function getAchievementRecommendation(achId, data) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.recommendation) return rec.recommendation;
  }
  if (data.recommended_achievements && data.recommended_achievements.includes(achId)) {
    return 'Include';
  }
  return 'De-emphasize';
}

function getAchievementConfidence(achId, data, achImportance) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.confidence) {
      const conf = rec.confidence.toLowerCase();
      if (conf.includes('very high')) return { level: 'very-high', text: 'Very High' };
      if (conf.includes('high'))      return { level: 'high',      text: 'High'      };
      if (conf.includes('medium'))    return { level: 'medium',    text: 'Medium'    };
      if (conf.includes('very low'))  return { level: 'very-low',  text: 'Very Low'  };
      if (conf.includes('low'))       return { level: 'low',       text: 'Low'       };
    }
  }
  const imp = achImportance || 5;
  if (imp >= 9) return { level: 'very-high', text: 'Very High' };
  if (imp >= 7) return { level: 'high',      text: 'High'      };
  if (imp >= 5) return { level: 'medium',    text: 'Medium'    };
  if (imp >= 3) return { level: 'low',       text: 'Low'       };
  return { level: 'very-low', text: 'Very Low' };
}

function getAchievementReasoning(achId, data, ach) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.reasoning) return rec.reasoning;
  }
  const relevantFor = (ach.relevant_for || []).join(', ');
  if (data.recommended_achievements && data.recommended_achievements.includes(achId)) {
    return relevantFor
      ? `Recommended for this role. Relevant for: ${relevantFor}.`
      : 'Recommended by AI as relevant to this role.';
  }
  return relevantFor
    ? `Relevant for: ${relevantFor}. Not specifically highlighted for this role.`
    : 'Not specifically highlighted for this role based on job requirements.';
}

// ---------------------------------------------------------------------------
// Fallback question generation
// ---------------------------------------------------------------------------

function buildFallbackPostAnalysisQuestions(data) {
  const questions = [];

  if (data.role_level) {
    questions.push({
      question: `This role appears to be at ${data.role_level} level. Should I emphasize your most senior experiences or include a broader range to show career progression?`,
      type: 'experience_level',
      choices: ['Emphasize most senior', 'Broader career progression', 'Let you decide based on analysis'],
    });
  }

  if (data.required_skills && data.required_skills.some(skill =>
      skill.toLowerCase().includes('leadership') ||
      skill.toLowerCase().includes('management') ||
      skill.toLowerCase().includes('team'))) {
    questions.push({
      question: 'This role has leadership components. Would you prefer me to emphasize your management experience or focus more on your technical contributions?',
      type: 'leadership_focus',
      choices: ['Emphasize management', 'Focus on technical', 'Balance both equally'],
    });
  }

  if (data.domain) {
    questions.push({
      question: `The role is in ${data.domain}. Do you have particular projects or achievements in this domain that you'd like me to highlight?`,
      type: 'domain_expertise',
      choices: ['Highlight domain-specific achievements', 'Use all available experience', 'Prioritize most recent work'],
    });
  }

  if (data.company) {
    questions.push({
      question: `For ${data.company}, would you like me to tailor emphasis toward their culture and values? If so, what should I prioritize?`,
      type: 'company_culture',
      choices: ['Research-driven / academic', 'Industry / commercial impact', 'Innovation / startup', 'Use cultural indicators from job description'],
    });
  }

  return questions;
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  getExperienceRecommendation, getConfidenceLevel, getExperienceReasoning,
  getSkillRecommendation, getSkillConfidence, getSkillReasoning,
  getAchievementRecommendation, getAchievementConfidence, getAchievementReasoning,
  buildFallbackPostAnalysisQuestions,
};
