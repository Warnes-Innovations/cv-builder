# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for scripts/utils/pricing_cache.py

Covers:
  - _cache_age / _is_stale helpers
  - get_cached_pricing (memory cache, file cache, static fallback)
  - get_pricing_updated_at / get_pricing_source
  - _fetch_openrouter_pricing (ID mapping, $/1M conversion, failure path)
  - refresh_pricing_cache (merge logic; copilot_multiplier preserved from static)
"""
import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import utils.pricing_cache as pc
from utils.pricing_cache import (
    STATIC_PRICING,
    _OPENROUTER_ID_MAP,
    _cache_age,
    _is_stale,
    _fetch_openrouter_pricing,
    get_cached_pricing,
    get_pricing_source,
    get_pricing_updated_at,
    lookup_runtime_pricing_bulk,
    refresh_pricing_cache,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_payload(source="openrouter", live_count=5, **pricing_overrides):
    """Return a cache payload whose timestamp is 1 hour ago (within TTL)."""
    ts = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    pricing = {**STATIC_PRICING, **pricing_overrides}
    return {"updated_at": ts, "source": source, "live_count": live_count, "pricing": pricing}


def _stale_payload():
    """Return a cache payload whose timestamp is 48 hours ago (beyond TTL)."""
    ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    return {"updated_at": ts, "source": "openrouter", "live_count": 0, "pricing": {}}


def _or_api_response(models):
    """Build a minimal OpenRouter /v1/models response dict."""
    return {
        "data": [
            {
                "id": m_id,
                "pricing": {
                    "prompt":     str(price_in  / 1_000_000),
                    "completion": str(price_out / 1_000_000),
                },
            }
            for m_id, price_in, price_out in models
        ]
    }


# ---------------------------------------------------------------------------
# _cache_age / _is_stale
# ---------------------------------------------------------------------------

class TestCacheAgeAndStale(unittest.TestCase):

    def test_none_payload_returns_none_age(self):
        self.assertIsNone(_cache_age(None))

    def test_none_payload_is_stale(self):
        self.assertTrue(_is_stale(None))

    def test_missing_updated_at_is_stale(self):
        self.assertTrue(_is_stale({"pricing": {}}))

    def test_fresh_payload_not_stale(self):
        payload = {"updated_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
        self.assertFalse(_is_stale(payload))

    def test_old_payload_is_stale(self):
        payload = {"updated_at": (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()}
        self.assertTrue(_is_stale(payload))

    def test_naive_timestamp_treated_as_utc(self):
        # Timestamps without tz info should still compute sensible age
        naive_ts = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(
            tzinfo=None).isoformat()
        payload = {"updated_at": naive_ts}
        age = _cache_age(payload)
        self.assertIsNotNone(age)
        self.assertAlmostEqual(age.total_seconds() / 3600, 1.0, delta=0.1)


# ---------------------------------------------------------------------------
# get_cached_pricing
# ---------------------------------------------------------------------------

class TestGetCachedPricing(unittest.TestCase):

    def setUp(self):
        # Reset in-memory cache before every test
        pc._mem_cache = None

    def test_falls_back_to_static_when_no_cache_file(self):
        with patch.object(pc, "_load_cache_file", return_value=None):
            result = get_cached_pricing()
        self.assertEqual(result, STATIC_PRICING)

    def test_uses_fresh_file_cache(self):
        override = {"test-model": {"cost_input": 1.0, "cost_output": 2.0}}
        payload = _fresh_payload(**override)
        with patch.object(pc, "_load_cache_file", return_value=payload):
            result = get_cached_pricing()
        self.assertIn("test-model", result)
        self.assertEqual(result["test-model"]["cost_input"], 1.0)

    def test_ignores_stale_file_cache(self):
        with patch.object(pc, "_load_cache_file", return_value=_stale_payload()):
            result = get_cached_pricing()
        # Should fall back to static — stale cache has empty pricing
        self.assertEqual(result, STATIC_PRICING)

    def test_memory_cache_returned_on_second_call(self):
        sentinel = {"gpt-4o": {"cost_input": 99.0, "cost_output": 99.0}}
        pc._mem_cache = sentinel
        result = get_cached_pricing()
        self.assertIs(result, sentinel)


# ---------------------------------------------------------------------------
# get_pricing_updated_at / get_pricing_source
# ---------------------------------------------------------------------------

class TestPricingMetadata(unittest.TestCase):

    def test_updated_at_none_when_no_file(self):
        with patch.object(pc, "_load_cache_file", return_value=None):
            self.assertIsNone(get_pricing_updated_at())

    def test_updated_at_from_payload(self):
        ts = "2026-03-10T12:00:00+00:00"
        with patch.object(pc, "_load_cache_file", return_value={"updated_at": ts}):
            self.assertEqual(get_pricing_updated_at(), ts)

    def test_source_none_when_no_file(self):
        with patch.object(pc, "_load_cache_file", return_value=None):
            self.assertIsNone(get_pricing_source())

    def test_source_openrouter(self):
        with patch.object(pc, "_load_cache_file", return_value={"source": "openrouter"}):
            self.assertEqual(get_pricing_source(), "openrouter")

    def test_source_static(self):
        with patch.object(pc, "_load_cache_file", return_value={"source": "static"}):
            self.assertEqual(get_pricing_source(), "static")


# ---------------------------------------------------------------------------
# _fetch_openrouter_pricing
# ---------------------------------------------------------------------------

class TestFetchOpenrouterPricing(unittest.TestCase):

    def _mock_requests_get(self, or_models):
        """Return a mock for requests.get that yields a fake OR API response."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = _or_api_response(or_models)
        mock_resp.raise_for_status.return_value = None
        mock_requests = MagicMock()
        mock_requests.get.return_value = mock_resp
        return mock_requests

    def test_known_openai_model_resolves(self):
        # gpt-4o prices are realistic; also validates $/1M conversion
        mock_requests = self._mock_requests_get([("openai/gpt-4o", 2.50, 10.00)])
        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNotNone(result)
        self.assertIn("gpt-4o", result)
        self.assertAlmostEqual(result["gpt-4o"]["cost_input"],  2.50, places=4)
        self.assertAlmostEqual(result["gpt-4o"]["cost_output"], 10.00, places=4)

    def test_known_anthropic_model_resolves(self):
        mock_requests = self._mock_requests_get([("anthropic/claude-3.7-sonnet", 3.00, 15.00)])
        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNotNone(result)
        self.assertIn("claude-3-7-sonnet", result)

    def test_known_llama_model_resolves_via_meta_prefix(self):
        # Groq-hosted llama models are listed under meta-llama/* on OR
        mock_requests = self._mock_requests_get([("meta-llama/llama-4-scout", 0.08, 0.30)])
        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNotNone(result)
        self.assertIn("llama-4-scout", result)

    def test_unmapped_or_model_ignored(self):
        # A model in OR that has no entry in _OPENROUTER_ID_MAP should not appear
        mock_requests = self._mock_requests_get([("some-provider/unknown-model", 1.0, 2.0)])
        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        # No mapped models → returns None (empty result treated as None)
        self.assertIsNone(result)

    def test_network_error_returns_none(self):
        mock_requests = MagicMock()
        mock_requests.get.side_effect = OSError("connection refused")

        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNone(result)

    def test_http_error_returns_none(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("HTTP 429")
        mock_requests = MagicMock()
        mock_requests.get.return_value = mock_resp

        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNone(result)

    def test_negative_price_excluded(self):
        # OR uses -1 to signal dynamic/special pricing; should not be stored
        or_data = {
            "data": [{
                "id": "openai/gpt-4o",
                "pricing": {"prompt": "-0.000001", "completion": "-0.000001"},
            }]
        }
        mock_resp = MagicMock()
        mock_resp.json.return_value = or_data
        mock_resp.raise_for_status.return_value = None
        mock_requests = MagicMock()
        mock_requests.get.return_value = mock_resp

        with patch.dict("sys.modules", {"requests": mock_requests}):
            result = _fetch_openrouter_pricing()

        self.assertIsNone(result)


# ---------------------------------------------------------------------------
# refresh_pricing_cache
# ---------------------------------------------------------------------------

def _mock_cache_file():
    """Return a MagicMock that stands in for pc._CACHE_FILE."""
    m = MagicMock(spec=Path)
    m.parent = MagicMock()
    m.parent.mkdir = MagicMock()
    return m


class TestRefreshPricingCache(unittest.TestCase):

    def setUp(self):
        pc._mem_cache = None

    def test_returns_static_when_fetch_fails(self):
        mock_file = _mock_cache_file()
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=None), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            result = refresh_pricing_cache()
        self.assertEqual(set(result.keys()), set(STATIC_PRICING.keys()))

    def test_live_prices_override_static(self):
        live = {"gpt-4o": {"cost_input": 1.11, "cost_output": 4.44}}
        mock_file = _mock_cache_file()
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=live), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            result = refresh_pricing_cache()
        self.assertAlmostEqual(result["gpt-4o"]["cost_input"],  1.11, places=4)
        self.assertAlmostEqual(result["gpt-4o"]["cost_output"], 4.44, places=4)

    def test_copilot_multiplier_preserved_from_static(self):
        # Live fetch replaces token prices but must NOT discard copilot_multiplier
        expected_mult = STATIC_PRICING["gpt-4o"]["copilot_multiplier"]
        live = {"gpt-4o": {"cost_input": 1.11, "cost_output": 4.44}}
        mock_file = _mock_cache_file()
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=live), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            result = refresh_pricing_cache()
        self.assertEqual(result["gpt-4o"].get("copilot_multiplier"), expected_mult)

    def test_static_only_model_retained(self):
        # o1-preview is not in _OPENROUTER_ID_MAP; must survive a refresh
        live = {"gpt-4o": {"cost_input": 2.50, "cost_output": 10.00}}
        mock_file = _mock_cache_file()
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=live), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            result = refresh_pricing_cache()
        self.assertIn("o1-preview", result)
        self.assertEqual(result["o1-preview"]["cost_input"],
                         STATIC_PRICING["o1-preview"]["cost_input"])

    def test_cache_file_written_with_correct_payload_structure(self):
        live = {"gpt-4o": {"cost_input": 2.50, "cost_output": 10.00}}
        captured = {}
        mock_file = _mock_cache_file()
        mock_file.write_text.side_effect = lambda text: captured.update(
            {"payload": json.loads(text)}
        )
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=live), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            refresh_pricing_cache()

        p = captured["payload"]
        self.assertIn("updated_at",  p)
        self.assertIn("source",      p)
        self.assertIn("live_count",  p)
        self.assertIn("pricing",     p)
        self.assertEqual(p["source"],     "openrouter")
        self.assertEqual(p["live_count"], 1)

    def test_source_is_static_when_fetch_fails(self):
        captured = {}
        mock_file = _mock_cache_file()
        mock_file.write_text.side_effect = lambda text: captured.update(
            {"payload": json.loads(text)}
        )
        with patch.object(pc, "_fetch_openrouter_pricing", return_value=None), \
             patch.object(pc, "_CACHE_FILE", mock_file):
            refresh_pricing_cache()

        self.assertEqual(captured["payload"]["source"],     "static")
        self.assertEqual(captured["payload"]["live_count"], 0)


class TestLookupRuntimePricingBulk(unittest.TestCase):

    def setUp(self):
        pc._mem_cache = None

    def test_returns_cached_price_for_runtime_model(self):
        live = {"gemini-2.5-flash": {"cost_input": 0.30, "cost_output": 2.50}}
        result = lookup_runtime_pricing_bulk(
            [("gemini", "models/gemini-2.5-flash")],
            cached_pricing=live,
        )
        self.assertEqual(result["models/gemini-2.5-flash"]["cost_input"], 0.30)

    def test_fetches_and_persists_unknown_runtime_model(self):
        catalog = {
            "google/gemini-3.1-flash-lite": {"cost_input": 0.12, "cost_output": 0.48},
        }
        persisted = {}

        def _capture_persist(entries):
            persisted.update(entries)

        with patch.object(pc, "_fetch_openrouter_catalog_index", return_value=catalog), \
             patch.object(pc, "_persist_runtime_pricing", side_effect=_capture_persist):
            result = lookup_runtime_pricing_bulk(
                [("gemini", "gemini-3.1-flash-lite")],
                cached_pricing={},
            )

        self.assertEqual(result["gemini-3.1-flash-lite"]["cost_output"], 0.48)
        self.assertIn("gemini-3.1-flash-lite", persisted)
        self.assertIn("google/gemini-3.1-flash-lite", persisted)

    def test_returns_empty_when_catalog_unavailable(self):
        with patch.object(pc, "_fetch_openrouter_catalog_index", return_value=None):
            result = lookup_runtime_pricing_bulk(
                [("gemini", "gemini-3.1-flash-lite")],
                cached_pricing={},
            )
        self.assertEqual(result, {})



class TestPricesMatchedByNamingRule(unittest.TestCase):
    """New models are priced without a _OPENROUTER_ID_MAP entry.

    OpenRouter spells versions with a dot (claude-sonnet-5.5); Anthropic IDs use
    a hyphen and may carry a date (claude-haiku-4-5-20251001).
    """

    def _fetch(self, or_models):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _or_api_response(or_models)
        mock_resp.raise_for_status.return_value = None
        mock_requests = MagicMock()
        mock_requests.get.return_value = mock_resp
        with patch.dict("sys.modules", {"requests": mock_requests}):
            return _fetch_openrouter_pricing()

    def test_unmapped_model_priced_under_local_ids(self):
        result = self._fetch([
            ("anthropic/claude-sonnet-5.5", 2.00, 10.00),
            ("anthropic/claude-sonnet-5.5:batch", 1.00, 5.00),
        ])
        for local_id in ("claude-sonnet-5-5", "claude-sonnet-5.5"):
            self.assertAlmostEqual(result[local_id]["cost_input"], 2.00, places=4)
        self.assertNotIn("claude-sonnet-5.5:batch", result)

    def test_map_entry_wins_over_naming_rule(self):
        """gpt-4o is mapped explicitly; a derived alias must not overwrite it."""
        result = self._fetch([("openai/gpt-4o", 2.50, 10.00)])
        self.assertAlmostEqual(result["gpt-4o"]["cost_input"], 2.50, places=4)

    def test_other_namespaces_ignored(self):
        result = self._fetch([("anthropic/claude-sonnet-5.5", 2.0, 10.0), ("someco/model-1.5", 9.0, 9.0)])
        self.assertNotIn("model-1-5", result)
        self.assertNotIn("model-1.5", result)

    def test_lookup_matches_dated_and_hyphenated_ids(self):
        prices = {"claude-haiku-4.5": {"cost_input": 1.0, "cost_output": 5.0}}
        with patch.object(pc, "_fetch_openrouter_catalog_index") as fetch:
            found = pc.lookup_cached_pricing("claude-haiku-4-5-20251001", "anthropic", prices)
            missing = pc.lookup_cached_pricing("claude-unknown-9", "anthropic", prices)
        self.assertEqual(found, {"cost_input": 1.0, "cost_output": 5.0})
        self.assertIsNone(missing)
        fetch.assert_not_called()   # local only: safe in a request path


class TestPricesRefreshWhileRunning(unittest.TestCase):
    """A long-running app re-checks prices every _CACHE_TTL_H, not only at startup."""

    def setUp(self):
        self._saved = (pc._mem_cache, pc._mem_checked_at)
        pc._mem_cache = {"gpt-4o": {"cost_input": 1.0, "cost_output": 2.0}}

    def tearDown(self):
        pc._mem_cache, pc._mem_checked_at = self._saved

    def test_recent_check_does_not_refresh(self):
        pc._mem_checked_at = pc.time.monotonic()
        with patch.object(pc, "maybe_refresh_in_background") as refresh:
            pc.get_cached_pricing()
        refresh.assert_not_called()

    def test_check_older_than_ttl_triggers_background_refresh_once(self):
        pc._mem_checked_at = pc.time.monotonic() - (pc._CACHE_TTL_H * 3600 + 1)
        with patch.object(pc, "maybe_refresh_in_background") as refresh:
            pc.get_cached_pricing()
            pc.get_cached_pricing()
        refresh.assert_called_once()


if __name__ == "__main__":
    unittest.main()
