# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Template-aware layout digest helpers for staged generation.

IMPORTANT: The selectors and scoring constants in this module are derived from
the current two-column layout in ``templates/cv-template.html``. Update this
module and the matching note in ``ARCHITECTURE.md`` whenever that template
changes.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup


TEMPLATE_PATH = 'templates/cv-template.html'
TEMPLATE_VERSION = 'cv-template.two-column.2026-03-24'
UPDATE_NOTE = (
    'Update layout_digest.py and ARCHITECTURE.md whenever '
    'templates/cv-template.html changes.'
)

FIRST_PAGE_RIGHT_BASE = 260.0
FIRST_PAGE_RIGHT_CAPACITY = 2300.0
FOLLOWING_LEFT_CAPACITY = 2300.0
FOLLOWING_RIGHT_CAPACITY = 3400.0
BOUNDARY_RECHECK_THRESHOLD = 0.18
LOW_CONFIDENCE_THRESHOLD = 0.60


def _collapse_text(value: str) -> str:
    return ' '.join(str(value or '').split())


def _text_len(node: Any) -> int:
    if node is None:
        return 0
    return len(_collapse_text(node.get_text(' ', strip=True)))


def _text_len_from_nodes(nodes: List[Any]) -> int:
    return sum(_text_len(node) for node in nodes)


def _safe_text(node: Any) -> str:
    if node is None:
        return ''
    return _collapse_text(node.get_text(' ', strip=True))


def build_layout_digest(preview_html: str) -> Dict[str, Any]:
    """Return a compact summary of pagination drivers for the current HTML."""
    soup = BeautifulSoup(preview_html or '', 'html.parser')

    page_one_left = soup.select_one('#page-one .left-col')
    page_one_right = soup.select_one('#page-one .right-col')
    page_two_left = soup.select_one('#page-two .left-col')
    page_two_right = soup.select_one('#page-two .right-col')
    page_three_left = soup.select_one('#page-three .left-col')

    summary_node = soup.select_one('#page-one .summary-text')
    achievement_nodes = soup.select('#page-one .achievement-list li')
    job_entries = soup.select('#page-two .job-entry')
    publication_nodes = soup.select('#page-two .pub-item')
    skill_groups = soup.select(
        '#page-two .skill-group, #page-three .skill-group'
    )

    crowded_skill_groups = 0
    skill_category_count = 0
    skill_item_count = 0
    skill_chars = 0
    skill_group_metrics: List[Dict[str, Any]] = []

    for group in skill_groups:
        category = _safe_text(group.select_one('h4'))
        item_nodes = group.select('li')
        item_count = len(item_nodes)
        item_chars = _text_len_from_nodes(item_nodes)
        group_chars = item_chars + len(category)
        crowded = item_count >= 5 or group_chars >= 110
        if crowded:
            crowded_skill_groups += 1
        skill_category_count += 1
        skill_item_count += item_count
        skill_chars += group_chars
        skill_group_metrics.append({
            'category': category,
            'item_count': item_count,
            'chars': group_chars,
            'crowded': crowded,
        })

    experience_blocks: List[Dict[str, Any]] = []
    for entry in job_entries:
        title = _safe_text(entry.select_one('.job-role'))
        bullet_nodes = entry.select('.job-details li')
        block_chars = _text_len(entry)
        experience_blocks.append({
            'title': title,
            'bullet_count': len(bullet_nodes),
            'chars': block_chars,
        })

    achievements_chars = _text_len_from_nodes(achievement_nodes)
    publications_chars = _text_len_from_nodes(publication_nodes)
    experiences_chars = sum(block['chars'] for block in experience_blocks)

    return {
        'template_path': TEMPLATE_PATH,
        'template_version': TEMPLATE_VERSION,
        'update_note': UPDATE_NOTE,
        'assumptions': {
            'two_column_pages': True,
            'minimum_pages': 2,
            'page_one_left_unlikely_to_overflow': True,
            'skills_live_in_left_column_after_page_one': True,
            'main_sections_live_in_right_column': True,
            'experience_entries_avoid_mid_entry_page_breaks': True,
        },
        'template_markers': {
            'page_one': (
                page_one_left is not None and page_one_right is not None
            ),
            'page_two': (
                page_two_left is not None and page_two_right is not None
            ),
            'page_three': page_three_left is not None,
        },
        'page_one_left': {
            'chars': _text_len(page_one_left),
        },
        'page_one_right': {
            'header_chars': _text_len(soup.select_one('#page-one .header')),
            'summary_chars': _text_len(summary_node),
            'achievement_count': len(achievement_nodes),
            'achievement_chars': achievements_chars,
            'chars': _text_len(page_one_right),
        },
        'page_two_plus_left': {
            'category_count': skill_category_count,
            'skill_item_count': skill_item_count,
            'skill_chars': skill_chars,
            'crowded_group_count': crowded_skill_groups,
            'page_two_chars': _text_len(page_two_left),
            'page_three_chars': _text_len(page_three_left),
        },
        'page_two_plus_right': {
            'experience_count': len(experience_blocks),
            'experience_chars': experiences_chars,
            'publication_count': len(publication_nodes),
            'publication_chars': publications_chars,
            'chars': _text_len(page_two_right),
            'max_experience_chars': max(
                (block['chars'] for block in experience_blocks),
                default=0,
            ),
        },
        'experience_blocks': experience_blocks,
        'skill_groups': skill_group_metrics,
    }


def estimate_pages_from_digest(digest: Dict[str, Any]) -> Dict[str, Any]:
    """Return a template-aware page estimate from a layout digest."""
    page_one_right = digest.get('page_one_right') or {}
    left_follow = digest.get('page_two_plus_left') or {}
    right_follow = digest.get('page_two_plus_right') or {}

    first_page_right_pressure = (
        FIRST_PAGE_RIGHT_BASE
        + float(page_one_right.get('summary_chars') or 0)
        + float(page_one_right.get('achievement_chars') or 0) * 1.05
        + float(page_one_right.get('achievement_count') or 0) * 45.0
    )
    first_page_spill = max(
        0.0,
        first_page_right_pressure - FIRST_PAGE_RIGHT_CAPACITY,
    )

    left_follow_pressure = (
        float(left_follow.get('skill_chars') or 0)
        + float(left_follow.get('category_count') or 0) * 95.0
        + float(left_follow.get('skill_item_count') or 0) * 18.0
        + float(left_follow.get('crowded_group_count') or 0) * 180.0
    )
    left_follow_pages = max(
        1.0,
        left_follow_pressure / FOLLOWING_LEFT_CAPACITY,
    )

    max_experience_chars = float(right_follow.get('max_experience_chars') or 0)
    right_follow_pressure = (
        float(right_follow.get('experience_chars') or 0)
        + float(right_follow.get('publication_chars') or 0) * 0.95
        + float(right_follow.get('experience_count') or 0) * 120.0
        + float(right_follow.get('publication_count') or 0) * 55.0
        + max(0.0, max_experience_chars - 420.0) * 0.35
        + first_page_spill
    )
    right_follow_pages = max(
        1.0,
        right_follow_pressure / FOLLOWING_RIGHT_CAPACITY,
    )

    estimated_pages = max(
        2.0,
        1.0 + max(left_follow_pages, right_follow_pages),
    )
    return {
        'estimated_pages': estimated_pages,
        'first_page_right_pressure': first_page_right_pressure,
        'first_page_spill': first_page_spill,
        'left_follow_pressure': left_follow_pressure,
        'right_follow_pressure': right_follow_pressure,
    }


def compare_layout_digests(
    baseline_digest: Dict[str, Any],
    baseline_exact_page_count: int | None,
    current_digest: Dict[str, Any],
) -> Dict[str, Any]:
    """Estimate current page count relative to an exact baseline."""
    baseline_estimate = estimate_pages_from_digest(baseline_digest)
    current_estimate = estimate_pages_from_digest(current_digest)

    correction = 0.0
    if baseline_exact_page_count is not None:
        correction = float(baseline_exact_page_count) - float(
            baseline_estimate['estimated_pages']
        )

    estimated_pages = max(
        2.0,
        float(current_estimate['estimated_pages']) + correction,
    )

    delta_first_right = (
        float(current_estimate['first_page_right_pressure'])
        - float(baseline_estimate['first_page_right_pressure'])
    )
    delta_left_follow = (
        float(current_estimate['left_follow_pressure'])
        - float(baseline_estimate['left_follow_pressure'])
    )
    delta_right_follow = (
        float(current_estimate['right_follow_pressure'])
        - float(baseline_estimate['right_follow_pressure'])
    )
    delta_max_experience = (
        float((current_digest.get('page_two_plus_right') or {}).get(
            'max_experience_chars'
        ) or 0)
        - float((baseline_digest.get('page_two_plus_right') or {}).get(
            'max_experience_chars'
        ) or 0)
    )

    confidence = 0.94
    marker_values = list(
        (current_digest.get('template_markers') or {}).values()
    )
    if not marker_values or not all(marker_values):
        confidence -= 0.35
    confidence -= min(0.18, abs(delta_first_right) / FIRST_PAGE_RIGHT_CAPACITY)
    confidence -= min(0.18, abs(delta_left_follow) / FOLLOWING_LEFT_CAPACITY)
    confidence -= min(0.18, abs(delta_right_follow) / FOLLOWING_RIGHT_CAPACITY)
    if delta_max_experience > 250:
        confidence -= 0.12
    if abs(correction) > 0.75:
        confidence -= 0.10
    confidence = max(0.20, min(0.99, confidence))

    fractional = estimated_pages - math.floor(estimated_pages)
    boundary_distance = min(fractional, 1.0 - fractional)
    needs_exact_recheck = (
        boundary_distance < BOUNDARY_RECHECK_THRESHOLD
        or confidence < LOW_CONFIDENCE_THRESHOLD
        or not all((current_digest.get('template_markers') or {}).values())
    )

    contributors: List[str] = []
    if abs(delta_first_right) >= 120:
        contributors.append('page-one summary/achievement block changed')
    if abs(delta_left_follow) >= 120:
        contributors.append('skills column pressure changed')
    if abs(delta_right_follow) >= 120:
        contributors.append('experience/publications column pressure changed')
    if delta_max_experience > 250:
        contributors.append('one experience block grew materially')
    if not contributors:
        contributors.append('small structural delta from baseline')

    return {
        'estimated_pages': estimated_pages,
        'warning': estimated_pages < 2.0 or estimated_pages > 3.0,
        'confidence': confidence,
        'needs_exact_recheck': needs_exact_recheck,
        'boundary_distance': boundary_distance,
        'baseline_exact_page_count': baseline_exact_page_count,
        'baseline_estimated_pages': baseline_estimate['estimated_pages'],
        'current_estimated_pages': current_estimate['estimated_pages'],
        'contributors': contributors,
        'pressure_delta': {
            'first_page_right': delta_first_right,
            'left_follow': delta_left_follow,
            'right_follow': delta_right_follow,
        },
    }


def flatten_layout_digest(digest: Dict[str, Any]) -> Dict[str, float]:
    """Convert a digest into numeric features for regression models."""
    markers = digest.get('template_markers') or {}
    page_one_left = digest.get('page_one_left') or {}
    page_one_right = digest.get('page_one_right') or {}
    left_follow = digest.get('page_two_plus_left') or {}
    right_follow = digest.get('page_two_plus_right') or {}
    experience_blocks = digest.get('experience_blocks') or []
    skill_groups = digest.get('skill_groups') or []

    experience_chars = [
        float(block.get('chars') or 0)
        for block in experience_blocks
    ]
    skill_group_chars = [
        float(group.get('chars') or 0)
        for group in skill_groups
    ]

    return {
        'marker_page_one': float(bool(markers.get('page_one'))),
        'marker_page_two': float(bool(markers.get('page_two'))),
        'marker_page_three': float(bool(markers.get('page_three'))),
        'page_one_left_chars': float(page_one_left.get('chars') or 0),
        'page_one_header_chars': float(
            page_one_right.get('header_chars') or 0
        ),
        'page_one_summary_chars': float(
            page_one_right.get('summary_chars') or 0
        ),
        'page_one_achievement_count': float(
            page_one_right.get('achievement_count') or 0
        ),
        'page_one_achievement_chars': float(
            page_one_right.get('achievement_chars') or 0
        ),
        'page_one_total_chars': float(page_one_right.get('chars') or 0),
        'skills_category_count': float(
            left_follow.get('category_count') or 0
        ),
        'skills_item_count': float(left_follow.get('skill_item_count') or 0),
        'skills_chars': float(left_follow.get('skill_chars') or 0),
        'skills_crowded_group_count': float(
            left_follow.get('crowded_group_count') or 0
        ),
        'skills_page_two_chars': float(
            left_follow.get('page_two_chars') or 0
        ),
        'skills_page_three_chars': float(
            left_follow.get('page_three_chars') or 0
        ),
        'experience_count': float(right_follow.get('experience_count') or 0),
        'experience_chars': float(right_follow.get('experience_chars') or 0),
        'publication_count': float(
            right_follow.get('publication_count') or 0
        ),
        'publication_chars': float(
            right_follow.get('publication_chars') or 0
        ),
        'right_column_chars': float(right_follow.get('chars') or 0),
        'max_experience_chars': float(
            right_follow.get('max_experience_chars') or 0
        ),
        'avg_experience_chars': (
            sum(experience_chars) / len(experience_chars)
            if experience_chars else 0.0
        ),
        'max_skill_group_chars': max(skill_group_chars, default=0.0),
        'avg_skill_group_chars': (
            sum(skill_group_chars) / len(skill_group_chars)
            if skill_group_chars else 0.0
        ),
    }


def blend_layout_prediction(
    heuristic_estimate: Dict[str, Any],
    model_prediction: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Blend the digest heuristic with an optional trained model."""
    if not model_prediction:
        blended = dict(heuristic_estimate)
        blended['source'] = 'delta-estimate'
        blended['model_prediction'] = None
        blended['model_disagreement'] = None
        return blended

    heuristic_pages = float(heuristic_estimate['estimated_pages'])
    model_pages = float(model_prediction['predicted_pages'])
    disagreement = abs(heuristic_pages - model_pages)
    blended_pages = (heuristic_pages * 0.65) + (model_pages * 0.35)

    confidence = float(heuristic_estimate['confidence'])
    confidence -= min(0.20, disagreement * 0.18)
    if disagreement <= 0.15:
        confidence += 0.04
    confidence = max(0.20, min(0.99, confidence))

    contributors = list(heuristic_estimate.get('contributors') or [])
    if disagreement > 0.25:
        contributors.append('random-forest calibration disagrees with digest')

    blended = dict(heuristic_estimate)
    blended.update({
        'estimated_pages': blended_pages,
        'warning': blended_pages < 2.0 or blended_pages > 3.0,
        'confidence': confidence,
        'needs_exact_recheck': (
            bool(heuristic_estimate.get('needs_exact_recheck'))
            or disagreement > 0.40
        ),
        'contributors': contributors,
        'source': 'delta-estimate-rf',
        'model_prediction': model_pages,
        'model_disagreement': disagreement,
    })
    return blended
