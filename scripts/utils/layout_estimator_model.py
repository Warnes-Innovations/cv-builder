# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Optional trained-model support for layout page estimation.

The web app should continue to function when no trained model is present.
These helpers therefore fail soft and simply return ``None`` when the model
artifact is missing or unreadable.
"""

from __future__ import annotations

import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from .layout_digest import flatten_layout_digest


DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / 'artifacts'
    / 'layout_estimator'
    / 'latest.pkl'
)


def _resolve_model_path(model_path: str | Path | None = None) -> Path:
    if model_path is None:
        return DEFAULT_MODEL_PATH
    return Path(model_path).expanduser().resolve()


@lru_cache(maxsize=4)
def _load_payload_cached(path_str: str) -> Optional[Dict[str, Any]]:
    path = Path(path_str)
    if not path.exists():
        return None

    try:
        with path.open('rb') as handle:
            payload = pickle.load(handle)
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None
    if 'model' not in payload or 'feature_names' not in payload:
        return None
    return payload


def clear_layout_estimator_cache() -> None:
    _load_payload_cached.cache_clear()


def load_layout_estimator_payload(
    model_path: str | Path | None = None,
) -> Optional[Dict[str, Any]]:
    path = _resolve_model_path(model_path)
    return _load_payload_cached(str(path))


def predict_layout_pages(
    digest: Dict[str, Any],
    *,
    model_path: str | Path | None = None,
) -> Optional[Dict[str, Any]]:
    """Return an optional model-based page-count prediction."""
    payload = load_layout_estimator_payload(model_path)
    if not payload:
        return None

    model = payload.get('model')
    feature_names = payload.get('feature_names') or []
    metadata = payload.get('metadata') or {}
    if model is None or not feature_names:
        return None

    features = flatten_layout_digest(digest)
    row = [[float(features.get(name, 0.0)) for name in feature_names]]

    try:
        prediction = float(model.predict(row)[0])
    except Exception:
        return None

    return {
        'predicted_pages': max(2.0, prediction),
        'model_path': str(_resolve_model_path(model_path)),
        'feature_count': len(feature_names),
        'model_version': metadata.get('model_version', 'random-forest'),
        'template_version': metadata.get('template_version'),
        'training_runs': metadata.get('training_runs'),
        'metadata': metadata,
    }
