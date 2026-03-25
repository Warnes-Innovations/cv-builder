# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for scripts/train_layout_estimator.py."""

from __future__ import annotations

import importlib.util
import random
import sys
from pathlib import Path

from bs4 import BeautifulSoup


MODULE_PATH = (
  Path(__file__).resolve().parents[1]
  / 'scripts'
  / 'train_layout_estimator.py'
)
spec = importlib.util.spec_from_file_location(
    'train_layout_estimator',
    MODULE_PATH,
)
assert spec is not None
assert spec.loader is not None
train_layout_estimator = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = train_layout_estimator
spec.loader.exec_module(train_layout_estimator)


def _sample_html() -> str:
    return '''
    <div id="page-one" class="page">
      <aside class="left-col"><div>Contact</div></aside>
      <main class="right-col">
        <header class="header"><h1>Test User</h1></header>
        <section>
          <p class="summary-text">Short summary text for testing.</p>
        </section>
        <section>
          <ul class="achievement-list">
            <li>Achievement one.</li>
            <li>Achievement two.</li>
          </ul>
        </section>
      </main>
    </div>
    <div id="page-two" class="page">
      <aside class="left-col">
        <div class="skill-group">
          <h4>Programming</h4><ul><li>Python</li><li>SQL</li></ul>
        </div>
        <div class="skill-group">
          <h4>Cloud</h4><ul><li>AWS</li><li>Docker</li></ul>
        </div>
      </aside>
      <main class="right-col">
        <div class="job-entry">
          <div class="job-role">Lead Engineer</div>
          <ul class="job-details">
            <li>Built platform systems.</li>
            <li>Mentored teams.</li>
          </ul>
        </div>
        <div class="pub-item">Publication citation.</div>
      </main>
    </div>
    <div id="page-three" class="page">
      <aside class="left-col"></aside>
      <main class="right-col"></main>
    </div>
    '''


def test_build_run_plan_is_deterministic():
    plan_a = train_layout_estimator._build_run_plan(
        6,
        ['simple', 'medium', 'complex'],
        1729,
    )
    plan_b = train_layout_estimator._build_run_plan(
        6,
        ['simple', 'medium', 'complex'],
        1729,
    )

    assert plan_a == plan_b
    assert len(plan_a) == 6
    assert {task.profile for task in plan_a}.issubset(
        {'simple', 'medium', 'complex'}
    )


def test_mutate_preview_html_preserves_page_markers():
    mutated = train_layout_estimator._mutate_preview_html(_sample_html(), 42)

    assert 'id="page-one"' in mutated
    assert 'id="page-two"' in mutated
    assert 'id="page-three"' in mutated
    assert mutated != _sample_html()


def test_mutate_achievement_list_matches_target_count():
    soup = BeautifulSoup(
        '''
        <div id="page-one">
          <ul class="achievement-list">
            <li>Achievement one.</li>
            <li>Achievement two.</li>
            <li>Achievement three.</li>
            <li>Achievement four.</li>
            <li>Achievement five.</li>
          </ul>
        </div>
        ''',
        'html.parser',
    )
    seed = 7
    expected_target = max(
        4,
        int(5 * random.Random(seed).uniform(0.55, 1.9)),
    )

    train_layout_estimator._mutate_achievement_list(
        soup,
        random.Random(seed),
    )

    assert (
        len(soup.select('#page-one .achievement-list li'))
        == expected_target
    )


def test_compute_target_count_stays_proportionate_for_tiny_lists():
    seed = 7
    expected_target = max(
        min(2, 4),
        int(2 * random.Random(seed).uniform(0.55, 1.9)),
    )

    target = train_layout_estimator._compute_target_count(
        2,
        random.Random(seed),
        soft_minimum=4,
    )

    assert target == expected_target
    assert target < 4


def test_mutate_text_in_range_stays_within_plus_minus_25_percent():
    text = 'one two three four five six seven eight'

    mutated = train_layout_estimator._mutate_text_in_range(
        text,
        random.Random(11),
        min_scale=0.75,
        max_scale=1.25,
    )

    mutated_words = len(mutated.split())
    assert 6 <= mutated_words <= 10


def test_mutate_job_bullet_list_matches_target_count():
    soup = BeautifulSoup(
        '''
        <div class="job-entry">
          <ul class="job-details">
            <li>one two three four five six seven eight</li>
            <li>alpha beta gamma delta epsilon zeta eta theta</li>
          </ul>
        </div>
        ''',
        'html.parser',
    )
    seed = 7
    expected_target = train_layout_estimator._compute_target_count(
        2,
        random.Random(seed),
        soft_minimum=4,
    )

    train_layout_estimator._mutate_job_bullet_list(
        soup.select_one('.job-entry'),
        soup,
        random.Random(seed),
    )

    assert len(soup.select('.job-details li')) == expected_target
    assert all(
      6 <= len(item.get_text(' ', strip=True).split()) <= 10
      for item in soup.select('.job-details li')
    )


def test_mutate_skill_group_list_matches_target_count():
    soup = BeautifulSoup(
        '''
        <div class="skill-group">
          <h4>Programming</h4>
          <ul>
            <li>one two three four five six seven eight</li>
            <li>alpha beta gamma delta epsilon zeta eta theta</li>
          </ul>
        </div>
        ''',
        'html.parser',
    )
    seed = 7
    expected_target = train_layout_estimator._compute_target_count(
        2,
        random.Random(seed),
        soft_minimum=4,
    )

    train_layout_estimator._mutate_skill_group_list(
        soup.select_one('.skill-group'),
        soup,
        random.Random(seed),
    )

    assert len(soup.select('ul li')) == expected_target
    assert all(
        6 <= len(item.get_text(' ', strip=True).split()) <= 10
        for item in soup.select('ul li')
    )


def test_compute_focus_target_count_caps_publication_reduction():
    seed = 7
    target = train_layout_estimator._compute_focus_target_count(
        10,
        random.Random(seed),
        max_fraction=0.25,
        minimum_focus_window=4,
    )

    assert 6 <= target <= 10


def test_compute_focus_target_count_uses_larger_fractional_cap():
    seed = 7
    target = train_layout_estimator._compute_focus_target_count(
        17,
        random.Random(seed),
        max_fraction=0.25,
        minimum_focus_window=4,
    )

    assert 12 <= target <= 17


def test_mutate_publication_list_respects_focus_window():
    soup = BeautifulSoup(
        '''
        <div id="page-two">
          <div class="pub-item">one two three four five six seven eight</div>
          <div class="pub-item">
            alpha beta gamma delta epsilon zeta eta theta
          </div>
          <div class="pub-item">iota kappa lambda mu nu xi omicron pi</div>
          <div class="pub-item">rho sigma tau upsilon phi chi psi omega</div>
          <div class="pub-item">publication five citation string</div>
          <div class="pub-item">publication six citation string</div>
          <div class="pub-item">publication seven citation string</div>
          <div class="pub-item">publication eight citation string</div>
          <div class="pub-item">publication nine citation string</div>
          <div class="pub-item">publication ten citation string</div>
        </div>
        ''',
        'html.parser',
    )
    seed = 7
    expected_target = train_layout_estimator._compute_focus_target_count(
        10,
        random.Random(seed),
        max_fraction=0.25,
        minimum_focus_window=4,
    )

    train_layout_estimator._mutate_publication_list(
        soup,
        random.Random(seed),
    )

    assert len(soup.select('#page-two .pub-item')) == expected_target


def test_parse_args_defaults_runs_to_500():
    args = train_layout_estimator.parse_args([])

    assert args.runs == 500
    assert args.renderer == 'chrome'
