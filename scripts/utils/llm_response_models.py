# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Pydantic v2 response models for structured LLM output.

These models describe the expected shape of JSON returned by the three
heavy structured LLM calls:

- ``JobAnalysisResponse``    — output of ``LLMClient.analyze_job_description``
- ``CustomizationResult``    — output of ``LLMClient.recommend_customizations``
- ``PublicationRankingItem`` — each element of the list returned by
                               ``LLMClient.rank_publications_for_job``

Validation is performed via ``model_validate(data)`` after JSON parsing. If the
model raises ``ValidationError`` (missing or wrong-type required fields), the
caller may issue a self-repair prompt and retry once before surfacing the error.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ── Job Analysis ─────────────────────────────────────────────────────────────

class JobAnalysisResponse(BaseModel):
    """Shape of the JSON object returned by ``analyze_job_description``.

    All fields intentionally have defaults so partially-populated LLM responses
    are accepted without triggering a repair round-trip.  The self-repair helper
    (``_validate_with_repair``) catches *type* mismatches; presence of individual
    fields is not enforced because any missing field degrades gracefully to its
    empty default in the downstream workflow.
    """

    title:                   str            = ""
    company:                 str            = ""
    domain:                  str            = ""
    role_level:              str            = ""
    required_skills:         list[str]      = Field(default_factory=list)
    preferred_skills:        list[str]      = Field(default_factory=list)
    must_have_requirements:  list[str]      = Field(default_factory=list)
    nice_to_have_requirements: list[str]    = Field(default_factory=list)
    culture_indicators:      list[str]      = Field(default_factory=list)
    ats_keywords:            list[str]      = Field(default_factory=list)
    reasoning:               Optional[str]  = None


# ── Customization Result ──────────────────────────────────────────────────────

class BulletOrder(BaseModel):
    order:              list[int] = Field(default_factory=list)
    reasoning:          str       = ""
    ats_impact:         str       = ""
    page_length_impact: str       = "none"


class ExperienceRecommendation(BaseModel):
    id:             str
    recommendation: str
    confidence:     str  # expected: 'high' | 'medium' | 'low'
    reasoning:      str                   = ""
    bullet_order:   Optional[BulletOrder] = None


class SkillGrouping(BaseModel):
    category:           str = ""
    group:              str = ""
    reasoning:          str = ""
    ats_impact:         str = ""
    page_length_impact: str = "none"


class SkillRecommendation(BaseModel):
    skill:          str
    recommendation: str
    confidence:     str  # expected: 'high' | 'medium' | 'low'
    reasoning:      str                    = ""
    grouping:       Optional[SkillGrouping] = None


class AchievementRecommendation(BaseModel):
    id:             str
    recommendation: str
    confidence:     str  # expected: 'high' | 'medium' | 'low'
    reasoning:      str = ""


class SuggestedAchievement(BaseModel):
    experience_id: str
    title:         str
    description:   str
    rationale:     str
    confidence:    str  # expected: 'high' | 'medium' | 'low'


class CustomizationResult(BaseModel):
    """Shape of the JSON object returned by ``recommend_customizations``.

    All fields intentionally have defaults; see ``JobAnalysisResponse`` for the
    rationale.  Missing list fields degrade to empty lists in the downstream
    backwards-compatibility shim that populates ``recommended_experiences``
    and ``recommended_achievements``.
    """

    experience_recommendations:  list[ExperienceRecommendation]  = Field(default_factory=list)
    skill_recommendations:       list[SkillRecommendation]       = Field(default_factory=list)
    recommended_skills:          list[str]                       = Field(default_factory=list)
    achievement_recommendations: list[AchievementRecommendation] = Field(default_factory=list)
    recommended_achievements:    list[str]                       = Field(default_factory=list)
    suggested_achievements:      list[SuggestedAchievement]      = Field(default_factory=list)
    summary_focus:               str                             = ""
    reasoning:                   str                             = ""


# ── Publication Ranking ───────────────────────────────────────────────────────

class PublicationRankingItem(BaseModel):
    """Shape of each element in the array returned by ``rank_publications_for_job``."""

    cite_key:        str
    relevance_score: int
    confidence:      str
    is_first_author: bool = False
    rationale:       str  = ""
