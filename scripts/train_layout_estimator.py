# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Train a random-forest layout estimator from Monte Carlo resume renders.

The script uses fixture-backed example profiles only. Each run randomly
chooses one of the requested profile tiers, perturbs the generated preview
HTML, renders the mutated HTML to PDF, extracts the exact page count, and
fits a random-forest regressor on digest-derived features.

Examples:
    conda run -n cvgen python scripts/train_layout_estimator.py
    conda run -n cvgen python scripts/train_layout_estimator.py \
        --runs 1000 --workers 8 --renderer chrome
    conda run -n cvgen python scripts/train_layout_estimator.py \
        --profiles medium complex --runs 750 --output-model /tmp/layout.pkl
"""

from __future__ import annotations

import argparse
import json
import math
import os
import pickle
import random
import shutil
import statistics
import sys
import tempfile
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

from bs4 import BeautifulSoup


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / 'scripts') not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / 'scripts'))

from scripts.utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from scripts.utils.layout_digest import (  # noqa: E402
    TEMPLATE_VERSION,
    build_layout_digest,
    flatten_layout_digest,
)
from scripts.utils.layout_estimator_model import (  # noqa: E402
    DEFAULT_MODEL_PATH,
)
from tests.helpers.example_profiles import (  # noqa: E402
    materialize_example_profile,
)


JOB_ANALYSIS = {
    'job_title': 'Senior Software Engineer',
    'title': 'Senior Software Engineer',
    'company': 'Acme Corp',
    'summary': 'Build and lead production software systems.',
    'ats_keywords': ['Python', 'Architecture', 'Leadership', 'AWS', 'Docker'],
    'must_have_requirements': ['Python', 'System design', 'Cloud'],
    'nice_to_have_requirements': ['Machine learning', 'Bioinformatics'],
    'key_requirements': ['Python', 'System design', 'Cloud'],
    'nice_to_have': ['Machine learning', 'Bioinformatics'],
    'domain': 'software engineering',
}

CUSTOMIZATIONS = {
    'base_font_size': '10px',
}

DEFAULT_PROFILES = ['simple', 'medium', 'complex']
DEFAULT_RUNS = 500
DEFAULT_TREES = 300
WORD_POOL = [
    'delivery', 'platform', 'systems', 'analytics', 'automation', 'workflow',
    'leadership', 'architecture', 'performance', 'quality', 'governance',
    'stakeholder', 'strategy', 'design', 'operational', 'reliability',
    'experimentation', 'measurement', 'mentoring', 'adoption',
]


class NullLLM:
    @staticmethod
    def semantic_match(text: str, requirements: list[str]) -> float:
        del text, requirements
        return 0.0


@dataclass(frozen=True)
class RunTask:
    run_id: int
    profile: str
    seed: int


def _make_orchestrator(profile_name: str) -> tuple[CVOrchestrator, Path]:
    fixture_root = Path(tempfile.mkdtemp(prefix='layout_model_fixture_'))
    master_path, publications_path, output_dir = materialize_example_profile(
        fixture_root,
        profile_name,
    )
    orchestrator = CVOrchestrator(
        master_data_path=str(master_path),
        publications_path=str(publications_path),
        output_dir=str(output_dir),
        llm_client=cast(Any, NullLLM()),
    )
    return orchestrator, fixture_root


def _read_pdf_page_count(pdf_path: Path) -> int | None:
    try:
        import pypdf
    except Exception as exc:  # pragma: no cover - dependency should exist
        raise RuntimeError(
            'pypdf is required to train the layout model'
        ) from exc

    reader = pypdf.PdfReader(str(pdf_path))
    return len(reader.pages)


def _random_phrase(rng: random.Random, minimum: int, maximum: int) -> str:
    word_count = rng.randint(minimum, maximum)
    return ' '.join(rng.choice(WORD_POOL) for _ in range(word_count))


def _mutate_text(text: str, rng: random.Random) -> str:
    words = [word for word in str(text or '').split() if word]
    if not words:
        # Empty nodes still need some content so the trainer can exercise
        # layout growth from a realistic short phrase.
        words = [_random_phrase(rng, 5, 9)]

    # Scale each text block down or up to simulate user edits ranging from
    # trimming content to expanding a section with more detail.
    target = max(4, int(len(words) * rng.uniform(0.55, 1.9)))
    if target <= len(words):
        mutated = words[:target]
    else:
        mutated = list(words)
        while len(mutated) < target:
            # When a section grows, add thematically neutral filler tokens so
            # the rendered length changes without coupling the trainer to any
            # specific resume wording.
            mutated.extend(_random_phrase(rng, 3, 8).split())
        mutated = mutated[:target]

    if rng.random() < 0.35:
        # Occasionally add one more phrase to create a heavier right-tail of
        # longer edits. This helps the model see boundary cases where a small
        # addition tips a section onto the next page.
        mutated.extend(_random_phrase(rng, 4, 10).split())
    return ' '.join(mutated)


def _mutate_text_in_range(
    text: str,
    rng: random.Random,
    *,
    min_scale: float,
    max_scale: float,
    minimum_words: int = 1,
) -> str:
    words = [word for word in str(text or '').split() if word]
    if not words:
        words = _random_phrase(rng, 5, 9).split()

    target = max(
        minimum_words,
        int(round(len(words) * rng.uniform(min_scale, max_scale))),
    )
    mutated = list(words)
    if target <= len(mutated):
        mutated = mutated[:target]
    else:
        while len(mutated) < target:
            mutated.extend(_random_phrase(rng, 2, 4).split())
        mutated = mutated[:target]

    return ' '.join(mutated)


def _compute_target_count(
    item_count: int,
    rng: random.Random,
    *,
    min_scale: float = 0.55,
    max_scale: float = 1.9,
    soft_minimum: int = 4,
    minimum_count: int = 1,
) -> int:
    if item_count <= 0:
        return 0

    baseline_minimum = max(minimum_count, min(item_count, soft_minimum))
    return max(
        baseline_minimum,
        int(item_count * rng.uniform(min_scale, max_scale)),
    )


def _compute_focus_target_count(
    item_count: int,
    rng: random.Random,
    *,
    max_fraction: float = 0.25,
    minimum_focus_window: int = 4,
    minimum_count: int = 1,
) -> int:
    if item_count <= minimum_count:
        return item_count

    max_reduction = max(
        math.ceil(item_count * max_fraction),
        minimum_focus_window,
    )
    max_reduction = min(max_reduction, item_count - minimum_count)
    reduction = rng.randint(0, max_reduction)
    return item_count - reduction


def _retarget_text_list(
    list_node: Any,
    soup: BeautifulSoup,
    original_texts: list[str],
    rng: random.Random,
    *,
    target_count: int,
    min_scale: float = 0.75,
    max_scale: float = 1.25,
    rewrite_probability: float = 0.6,
) -> None:
    if not original_texts:
        return

    selected_texts = list(original_texts)
    if target_count < len(selected_texts):
        rng.shuffle(selected_texts)
        selected_texts = selected_texts[:target_count]
    while len(selected_texts) < target_count:
        selected_texts.append(rng.choice(original_texts))

    list_node.clear()
    for index, text in enumerate(selected_texts):
        item = soup.new_tag('li')
        if index >= len(original_texts) or rng.random() < rewrite_probability:
            item.string = _mutate_text_in_range(
                text,
                rng,
                min_scale=min_scale,
                max_scale=max_scale,
            )
        else:
            item.string = text
        list_node.append(item)


def _mutate_achievement_list(soup: BeautifulSoup, rng: random.Random) -> None:
    achievement_list = soup.select_one('#page-one .achievement-list')
    if achievement_list is None:
        return

    achievement_items = achievement_list.select('li')
    if not achievement_items:
        return

    original_texts = [
        item.get_text(' ', strip=True)
        for item in achievement_items
    ]
    target_achievements = _compute_target_count(
        len(original_texts),
        rng,
        soft_minimum=4,
    )

    # Tiny achievement lists should stay proportionate instead of jumping to a
    # blanket minimum of four items, but rewritten bullets still stay within a
    # moderate +/-25% text-length band.
    _retarget_text_list(
        achievement_list,
        soup,
        original_texts,
        rng,
        target_count=target_achievements,
    )


def _mutate_job_bullet_list(
    entry: Any,
    soup: BeautifulSoup,
    rng: random.Random,
) -> None:
    details_list = entry.select_one('.job-details')
    if details_list is None:
        return

    bullet_items = details_list.select('li')
    if not bullet_items:
        return

    original_texts = [
        item.get_text(' ', strip=True)
        for item in bullet_items
    ]
    target_bullets = _compute_target_count(
        len(original_texts),
        rng,
        soft_minimum=4,
    )

    # Job bullets follow the same list-size and bounded rewrite behavior as
    # achievements so both sections train the model with comparable mutations.
    _retarget_text_list(
        details_list,
        soup,
        original_texts,
        rng,
        target_count=target_bullets,
    )


def _mutate_skill_group_list(
    group: Any,
    soup: BeautifulSoup,
    rng: random.Random,
) -> None:
    skill_list = group.select_one('ul')
    if skill_list is None:
        return

    skill_items = skill_list.select('li')
    if not skill_items:
        return

    original_texts = [
        item.get_text(' ', strip=True)
        for item in skill_items
    ]
    target_skills = _compute_target_count(
        len(original_texts),
        rng,
        soft_minimum=4,
    )

    # Skill groups now follow the same proportional list-retarget behavior as
    # achievements and job bullets so grouped skills stay plausible while their
    # line pressure still varies meaningfully across samples.
    _retarget_text_list(
        skill_list,
        soup,
        original_texts,
        rng,
        target_count=target_skills,
    )


def _mutate_publication_list(soup: BeautifulSoup, rng: random.Random) -> None:
    publication_items = soup.select('#page-two .pub-item')
    if not publication_items:
        return

    original_texts = [
        item.get_text(' ', strip=True)
        for item in publication_items
    ]
    target_publications = _compute_focus_target_count(
        len(original_texts),
        rng,
        max_fraction=0.25,
        minimum_focus_window=4,
    )

    # Publication focusing should only trim from the current list, but the kept
    # citations can still shift modestly in length to reflect formatting drift.
    for item, text in zip(publication_items, original_texts):
        item.string = text

    selected_items = list(publication_items)
    if target_publications < len(selected_items):
        rng.shuffle(selected_items)
        for item in selected_items[target_publications:]:
            item.decompose()

    for item in soup.select('#page-two .pub-item'):
        item.string = _mutate_text_in_range(
            item.get_text(' ', strip=True),
            rng,
            min_scale=0.75,
            max_scale=1.25,
        )


def _mutate_preview_html(preview_html: str, seed: int) -> str:
    rng = random.Random(seed)
    soup = BeautifulSoup(preview_html, 'html.parser')

    summary = soup.select_one('#page-one .summary-text')
    if summary is not None:
        # Summary edits often change in-place rather than
        # appearing/disappearing, so mutate the prose length but keep the
        # section itself present.
        summary.string = _mutate_text(summary.get_text(' ', strip=True), rng)

    _mutate_achievement_list(soup, rng)

    skill_groups = soup.select(
        '#page-two .skill-group, #page-three .skill-group'
    )
    if len(skill_groups) >= 2 and rng.random() < 0.45:
        # Skill regrouping is a real layout driver: the same skills can
        # occupy different numbers of lines depending on how they cluster
        # under headings.
        source_group = rng.choice(skill_groups)
        target_group = rng.choice(
            [group for group in skill_groups if group is not source_group]
        )
        source_items = source_group.select('li')
        if source_items:
            moving_item = rng.choice(source_items)
            target_list = target_group.select_one('ul')
            if target_list is not None:
                target_list.append(moving_item.extract())

    for group in skill_groups:
        _mutate_skill_group_list(group, soup, rng)

    job_entries = soup.select('#page-two .job-entry')
    for entry in job_entries:
        _mutate_job_bullet_list(entry, soup, rng)

    _mutate_publication_list(soup, rng)

    return str(soup)


def _build_run_plan(
    runs: int,
    profiles: list[str],
    seed: int,
) -> list[RunTask]:
    rng = random.Random(seed)
    return [
        RunTask(
            run_id=index,
            profile=rng.choice(profiles),
            seed=rng.randrange(1, 2**31),
        )
        for index in range(runs)
    ]


def _generate_training_sample(
    task: RunTask,
    *,
    renderer: str,
) -> dict[str, Any]:
    fixture_root: Path | None = None
    render_root = Path(tempfile.mkdtemp(prefix='layout_model_render_'))
    try:
        orchestrator, fixture_root = _make_orchestrator(task.profile)
        baseline_html = orchestrator.render_html_preview(
            job_analysis=JOB_ANALYSIS,
            customizations=CUSTOMIZATIONS,
            approved_rewrites=[],
            spell_audit=[],
        )
        mutated_html = _mutate_preview_html(baseline_html, task.seed)
        digest = build_layout_digest(mutated_html)
        features = flatten_layout_digest(digest)

        final_paths = orchestrator.generate_final_from_confirmed_html(
            confirmed_html=mutated_html,
            output_dir=render_root,
            filename_base=f'layout_training_{task.run_id}',
            preferred_renderer=renderer,
        )
        pdf_path = Path(final_paths['pdf'])
        actual_pages = _read_pdf_page_count(pdf_path)
        if actual_pages is None:
            raise RuntimeError('Unable to read PDF page count')

        return {
            'status': 'ok',
            'run_id': task.run_id,
            'profile': task.profile,
            'seed': task.seed,
            'actual_pages': int(actual_pages),
            'pdf_renderer': final_paths.get('renderer'),
            'pdf_renderer_detail': final_paths.get('renderer_detail', ''),
            'features': features,
        }
    except Exception as exc:
        return {
            'status': 'error',
            'run_id': task.run_id,
            'profile': task.profile,
            'seed': task.seed,
            'error_type': type(exc).__name__,
            'error_message': str(exc),
        }
    finally:
        if fixture_root is not None:
            shutil.rmtree(fixture_root, ignore_errors=True)
        shutil.rmtree(render_root, ignore_errors=True)


def _fit_random_forest(
    rows: list[dict[str, Any]],
    *,
    trees: int,
    seed: int,
) -> tuple[Any, list[str], dict[str, Any]]:
    try:
        from sklearn.ensemble import (  # type: ignore[import-untyped]
            RandomForestRegressor,
        )
        from sklearn.metrics import (  # type: ignore[import-untyped]
            mean_absolute_error,
            mean_squared_error,
            r2_score,
        )
        from sklearn.model_selection import (  # type: ignore[import-untyped]
            train_test_split,
        )
    except ImportError as exc:  # pragma: no cover - exercised manually
        raise RuntimeError(
            'scikit-learn is required. Install scripts/requirements-conda.txt '
            'or scripts/requirements.txt before training the layout model.'
        ) from exc

    feature_names = sorted(
        {
            key
            for row in rows
            for key in (row.get('features') or {}).keys()
        }
    )
    X = [
        [
            float((row.get('features') or {}).get(name, 0.0))
            for name in feature_names
        ]
        for row in rows
    ]
    y = [float(row['actual_pages']) for row in rows]

    if len(rows) >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=seed,
        )
    else:
        X_train, X_test, y_train, y_test = X, X, y, y

    model = RandomForestRegressor(
        n_estimators=trees,
        random_state=seed,
        n_jobs=-1,
        bootstrap=True,
        oob_score=True,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    importances = sorted(
        zip(feature_names, model.feature_importances_),
        key=lambda item: item[1],
        reverse=True,
    )
    metrics = {
        'train_count': len(X_train),
        'test_count': len(X_test),
        'mae': float(mean_absolute_error(y_test, y_pred)),
        'rmse': float(rmse),
        'r2': float(r2_score(y_test, y_pred)) if len(X_test) > 1 else None,
        'oob_score': float(getattr(model, 'oob_score_', 0.0)),
        'top_features': [
            {'name': name, 'importance': float(value)}
            for name, value in importances[:10]
        ],
    }
    return model, feature_names, metrics


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding='utf-8')


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True))
            handle.write('\n')


def _summarize_successes(rows: list[dict[str, Any]]) -> dict[str, Any]:
    page_counts = [row['actual_pages'] for row in rows]
    profiles = Counter(row['profile'] for row in rows)
    return {
        'successful_runs': len(rows),
        'page_count_min': min(page_counts) if page_counts else None,
        'page_count_max': max(page_counts) if page_counts else None,
        'page_count_mean': (
            statistics.mean(page_counts) if page_counts else None
        ),
        'profile_counts': dict(sorted(profiles.items())),
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Train a Monte Carlo random-forest layout estimator.',
    )
    parser.add_argument(
        '--runs',
        type=int,
        default=DEFAULT_RUNS,
        help='Total Monte Carlo runs across randomly selected profiles.',
    )
    parser.add_argument(
        '--profiles',
        nargs='+',
        default=list(DEFAULT_PROFILES),
        choices=list(DEFAULT_PROFILES),
        help='Fixture-backed profile tiers to sample from.',
    )
    parser.add_argument(
        '--renderer',
        default='chrome',
        choices=['auto', 'chrome', 'weasyprint'],
        help='PDF renderer to use for exact labels.',
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=max(1, (os.cpu_count() or 2) - 1),
        help='Parallel worker count for Monte Carlo rendering.',
    )
    parser.add_argument(
        '--trees',
        type=int,
        default=DEFAULT_TREES,
        help='Random-forest tree count.',
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=1729,
        help='Top-level random seed for run planning and train/test split.',
    )
    parser.add_argument(
        '--output-model',
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help='Pickle file to write the trained estimator artifact to.',
    )
    parser.add_argument(
        '--output-data',
        type=Path,
        default=(
            DEFAULT_MODEL_PATH.parent / 'latest.dataset.jsonl'
        ),
        help='JSONL file to write successful and failed run rows to.',
    )
    parser.add_argument(
        '--output-summary',
        type=Path,
        default=(
            DEFAULT_MODEL_PATH.parent / 'latest.summary.json'
        ),
        help='JSON file to write the training summary to.',
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    plan = _build_run_plan(args.runs, list(args.profiles), args.seed)

    rows: list[dict[str, Any]] = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(
                _generate_training_sample,
                task,
                renderer=args.renderer,
            ): task
            for task in plan
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            row = future.result()
            rows.append(row)
            if completed % 25 == 0 or completed == len(plan):
                print(
                    f'[{completed}/{len(plan)}] '
                    f"ok={sum(r['status'] == 'ok' for r in rows)} "
                    f"error={sum(r['status'] == 'error' for r in rows)}",
                    file=sys.stderr,
                )

    successes = [row for row in rows if row['status'] == 'ok']
    failures = [row for row in rows if row['status'] == 'error']
    if not successes:
        summary = {
            'ok': False,
            'error': 'No successful training rows were generated.',
            'runs': args.runs,
            'profiles': args.profiles,
            'renderer': args.renderer,
            'workers': args.workers,
            'failures': failures[:20],
        }
        _write_jsonl(args.output_data, rows)
        _write_json(args.output_summary, summary)
        print(json.dumps(summary, indent=2))
        return 1

    model, feature_names, metrics = _fit_random_forest(
        successes,
        trees=args.trees,
        seed=args.seed,
    )

    metadata = {
        'model_version': 'random-forest',
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'template_version': TEMPLATE_VERSION,
        'training_runs': args.runs,
        'successful_runs': len(successes),
        'failed_runs': len(failures),
        'profiles': list(args.profiles),
        'renderer': args.renderer,
        'workers': args.workers,
        'seed': args.seed,
        'metrics': metrics,
    }
    payload = {
        'model': model,
        'feature_names': feature_names,
        'metadata': metadata,
    }

    args.output_model.parent.mkdir(parents=True, exist_ok=True)
    with args.output_model.open('wb') as handle:
        pickle.dump(payload, handle)

    _write_jsonl(args.output_data, rows)
    summary = {
        'ok': True,
        'model_path': str(args.output_model),
        'data_path': str(args.output_data),
        'summary_path': str(args.output_summary),
        'runs': args.runs,
        'profiles': list(args.profiles),
        'renderer': args.renderer,
        'workers': args.workers,
        'seed': args.seed,
        'dataset': _summarize_successes(successes),
        'failed_runs': len(failures),
        'metrics': metrics,
    }
    _write_json(args.output_summary, summary)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
