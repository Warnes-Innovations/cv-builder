# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from scripts.utils.layout_digest import build_layout_digest
from scripts.utils.layout_estimator_model import predict_layout_pages


class _FakeModel:
    def predict(self, rows):
        assert len(rows) == 1
        return [2.75]


def test_predict_layout_pages_returns_none_without_model(monkeypatch):
    monkeypatch.setattr(
        'scripts.utils.layout_estimator_model.load_layout_estimator_payload',
        lambda _model_path=None: None,
    )

    assert predict_layout_pages(build_layout_digest('<div></div>')) is None


def test_predict_layout_pages_uses_saved_feature_names(monkeypatch):
    digest = build_layout_digest(
        '''
        <div id="page-one"><div class="left-col"></div><div class="right-col">
          <div class="header">Header</div><p class="summary-text">Summary</p>
          <ul class="achievement-list"><li>Achievement</li></ul>
        </div></div>
        <div id="page-two"><div class="left-col"></div><div class="right-col">
          <div class="job-entry"><div class="job-role">Role</div>
          <ul class="job-details"><li>Bullet</li></ul></div>
        </div></div>
        <div id="page-three"><div class="left-col"></div></div>
        '''
    )
    monkeypatch.setattr(
        'scripts.utils.layout_estimator_model.load_layout_estimator_payload',
        lambda _model_path=None: {
            'model': _FakeModel(),
            'feature_names': ['page_one_summary_chars', 'experience_count'],
            'metadata': {
                'model_version': 'random-forest',
                'template_version': 'test-template',
                'training_runs': 500,
            },
        },
    )

    prediction = predict_layout_pages(digest)

    assert prediction is not None
    assert prediction['predicted_pages'] == 2.75
    assert prediction['feature_count'] == 2
    assert prediction['template_version'] == 'test-template'
