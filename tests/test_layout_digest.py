# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from scripts.utils.layout_digest import (
    blend_layout_prediction,
    build_layout_digest,
    compare_layout_digests,
    estimate_pages_from_digest,
    flatten_layout_digest,
)


def _sample_html(
    summary: str = 'Short summary.',
    extra_job_bullets: int = 0,
) -> str:
    extra_bullets = ''.join(
        f'<li>Extra bullet {index} with quantified delivery impact.</li>'
        for index in range(extra_job_bullets)
    )
    return f"""
    <div id="page-one" class="page">
      <aside class="left-col">
        <div>Contact Education Awards Languages</div>
      </aside>
      <main class="right-col">
        <header class="header"><h1>Test User</h1><div>Engineer</div></header>
        <section class="section">
          <p class="summary-text">{summary}</p>
        </section>
        <section class="section">
          <ul class="achievement-list"><li>Achievement one.</li></ul>
        </section>
      </main>
    </div>
    <div id="page-two" class="page">
      <aside class="left-col">
        <div class="skill-group">
          <h4>Programming</h4>
          <ul><li>Python</li><li>SQL</li></ul>
        </div>
      </aside>
      <main class="right-col">
        <div class="job-entry">
          <div class="job-role">Lead Engineer</div>
          <ul class="job-details">
            <li>Built a large workflow.</li>
            {extra_bullets}
          </ul>
        </div>
      </main>
    </div>
    """


def test_build_layout_digest_extracts_template_regions():
    digest = build_layout_digest(_sample_html())

    assert digest['template_markers']['page_one'] is True
    assert digest['template_markers']['page_three'] is False
    assert digest['page_one_right']['summary_chars'] > 0
    assert digest['page_two_plus_left']['skill_item_count'] == 2
    assert digest['page_two_plus_right']['experience_count'] == 1


def test_estimate_pages_from_digest_respects_minimum_two_pages():
    digest = build_layout_digest(_sample_html())

    estimate = estimate_pages_from_digest(digest)

    assert estimate['estimated_pages'] >= 2.0


def test_compare_layout_digests_flags_large_growth_for_recheck():
    baseline = build_layout_digest(_sample_html())
    current = build_layout_digest(
        _sample_html(
            summary=(
                'Expanded summary with much more detail about strategy '
                'and delivery. ' * 8
            ),
            extra_job_bullets=12,
        )
    )

    comparison = compare_layout_digests(
        baseline,
        baseline_exact_page_count=2,
        current_digest=current,
    )

    assert comparison['estimated_pages'] >= 2.0
    assert comparison['needs_exact_recheck'] is True
    assert comparison['confidence'] < 0.94


def test_flatten_layout_digest_returns_numeric_feature_map():
    digest = build_layout_digest(_sample_html(extra_job_bullets=3))

    features = flatten_layout_digest(digest)

    assert features['marker_page_one'] == 1.0
    assert features['skills_item_count'] == 2.0
    assert features['experience_count'] == 1.0
    assert features['max_experience_chars'] >= features['avg_experience_chars']


def test_blend_layout_prediction_uses_model_signal_when_available():
    blended = blend_layout_prediction(
        {
            'estimated_pages': 2.2,
            'warning': False,
            'confidence': 0.82,
            'needs_exact_recheck': False,
            'contributors': ['skills column pressure changed'],
        },
        {'predicted_pages': 2.6},
    )

    assert blended['source'] == 'delta-estimate-rf'
    assert blended['model_prediction'] == 2.6
    assert 2.2 < blended['estimated_pages'] < 2.6
