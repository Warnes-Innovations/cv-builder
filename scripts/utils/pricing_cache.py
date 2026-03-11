"""Model pricing cache for cv-builder.

Provides best-known pricing data for LLM models.  On each refresh the module
attempts to fetch live token prices from the OpenRouter public API
(https://openrouter.ai/api/v1/models — free, no API key required).  If the
fetch fails, a static fallback baseline compiled March 2026 is used instead.
A JSON cache file stores the fetched data and timestamp; the UI shows source
and freshness information.

Usage::

    from utils.pricing_cache import get_cached_pricing, refresh_pricing_cache

    prices       = get_cached_pricing()               # {model_id: {…}}
    model_info   = prices.get("gpt-4o", {})           # {cost_input, cost_output, …}
    age_str      = get_pricing_updated_at()           # ISO-8601 string or None
    source       = get_pricing_source()               # 'openrouter' | 'static' | None
    refresh_pricing_cache()                           # fetch live prices + write cache

Key fields per model in the returned dict:
    cost_input        (float | None) – USD per 1M input  tokens, direct API
    cost_output       (float | None) – USD per 1M output tokens, direct API
    copilot_multiplier(float | None) – Copilot premium-request multiplier (Nx)
                                       0.0 = free for paid-plan subscribers
                                       None = not available via Copilot

OpenRouter coverage:
    Token prices (cost_input / cost_output) are updated live for OpenAI,
    Anthropic, Google Gemini, and Groq-hosted models. Groq-served models
    (Meta-Llama, Mistral) appear on OpenRouter under their original provider
    namespaces (meta-llama/*, mistralai/*) — not a groq/* tier.
    copilot_multiplier values are *always* taken from STATIC_PRICING because
    OpenRouter has no concept of GitHub Copilot billing tiers.
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_CACHE_FILE   = Path.home() / ".cache" / "cv-builder" / "model_pricing.json"
_CACHE_TTL_H  = 24          # hours before a cache file is considered stale
_refresh_lock = threading.Lock()

# ── OpenRouter live-pricing constants ────────────────────────────────────────
_OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models"
_OPENROUTER_TIMEOUT = 15   # seconds

# Maps our internal short model IDs → canonical OpenRouter model IDs.
# OR prices are in USD-per-token; we multiply × 1,000,000 → $/1M.
# Models absent from the fetched OR catalogue fall back to STATIC_PRICING.
_OPENROUTER_ID_MAP: Dict[str, str] = {
    # ── OpenAI (OR price ≈ direct OpenAI API price) ───────────────────────
    "gpt-4o":                     "openai/gpt-4o",
    "gpt-4o-mini":                "openai/gpt-4o-mini",
    "gpt-4.1":                    "openai/gpt-4.1",
    "gpt-4.1-mini":               "openai/gpt-4.1-mini",
    "gpt-4-turbo-preview":        "openai/gpt-4-turbo-preview",
    "gpt-3.5-turbo":              "openai/gpt-3.5-turbo",
    "o1-preview":                 "openai/o1-preview",
    "o1-mini":                    "openai/o1-mini",
    "gpt-5-mini":                 "openai/gpt-5-mini",
    # ── Anthropic (OR price ≈ direct Anthropic API price) ─────────────────
    "claude-3-haiku":             "anthropic/claude-3-haiku",
    "claude-3-haiku-20240307":    "anthropic/claude-3-haiku",
    "claude-3.5-sonnet":          "anthropic/claude-3.5-sonnet",
    "claude-3-5-sonnet":          "anthropic/claude-3.5-sonnet",
    "claude-3-5-sonnet-20241022": "anthropic/claude-3.5-sonnet",
    "claude-3-7-sonnet":          "anthropic/claude-3.7-sonnet",
    "claude-3-opus":              "anthropic/claude-3-opus",
    "claude-3-opus-20240229":     "anthropic/claude-3-opus",
    "claude-sonnet-4-6":          "anthropic/claude-sonnet-4.6",
    # ── Google Gemini (OR price ≈ direct Google AI API price) ─────────────
    # Note: gemini-1.5 models are not listed on OpenRouter; fall back to static.
    "gemini-2.0-flash":           "google/gemini-2.0-flash-001",
    "gemini-2.5-flash":           "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite":      "google/gemini-2.5-flash-lite",
    "gemini-2.5-pro":             "google/gemini-2.5-pro",
    # ── Meta/Mistral via Groq (OR hosts these under original provider IDs) ─
    "llama3-70b-8192":            "meta-llama/llama-3-70b-instruct",
    "llama-3.3-70b-versatile":    "meta-llama/llama-3.3-70b-instruct",
    "llama-3.1-8b-instant":       "meta-llama/llama-3.1-8b-instruct",
    "llama-4-scout":              "meta-llama/llama-4-scout",
    "llama-4-maverick":           "meta-llama/llama-4-maverick",
    "mixtral-8x7b-32768":         "mistralai/mixtral-8x7b-instruct",
}

# -----------------------------------------------------------------
# Baseline pricing compiled March 2026 from official provider pages.
#
# cost_input        : USD per 1M input  tokens (direct/API billing)
# cost_output       : USD per 1M output tokens (direct/API billing)
# copilot_multiplier: GitHub Copilot premium-request multiplier (Nx).
#                     0   = free (doesn't consume premium requests for paid plans)
#                     0.33= 0.33 premium requests per call (3 calls per request)
#                     1   = 1 premium request per call
#                     3   = 3 premium requests per call
#                     None= not available via GitHub Copilot
# -----------------------------------------------------------------
STATIC_PRICING: Dict[str, Dict[str, Any]] = {
    # ── OpenAI ────────────────────────────────────────────────────────────
    "gpt-4o":                     {"cost_input":  2.50, "cost_output": 10.00, "copilot_multiplier": 0.0},
    "gpt-4o-mini":                {"cost_input":  0.15, "cost_output":  0.60, "copilot_multiplier": 0.0},
    "gpt-4.1":                    {"cost_input":  2.00, "cost_output":  8.00, "copilot_multiplier": 0.0},
    "gpt-4.1-mini":               {"cost_input":  0.40, "cost_output":  1.60, "copilot_multiplier": 0.0},
    "gpt-4-turbo-preview":        {"cost_input": 10.00, "cost_output": 30.00},
    "gpt-3.5-turbo":              {"cost_input":  0.50, "cost_output":  1.50},
    "o1-preview":                 {"cost_input": 15.00, "cost_output": 60.00},
    "o1-mini":                    {"cost_input":  3.00, "cost_output": 12.00},
    "gpt-5-mini":                 {"cost_input":  0.25, "cost_output":  2.00, "copilot_multiplier": 0.0},
    "gpt-5.4":                    {"cost_input":  2.50, "cost_output": 15.00, "copilot_multiplier": 1.0},
    # ── Anthropic Claude ──────────────────────────────────────────────────
    "claude-3-haiku":             {"cost_input":  0.25, "cost_output":  1.25, "copilot_multiplier": 0.33},
    "claude-3-haiku-20240307":    {"cost_input":  0.25, "cost_output":  1.25},
    "claude-3.5-sonnet":          {"cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0},
    "claude-3-5-sonnet":          {"cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0},
    "claude-3-5-sonnet-20241022": {"cost_input":  3.00, "cost_output": 15.00},
    "claude-3-7-sonnet":          {"cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0},
    "claude-3-opus":              {"cost_input": 15.00, "cost_output": 75.00, "copilot_multiplier": 3.0},
    "claude-3-opus-20240229":     {"cost_input": 15.00, "cost_output": 75.00},
    "claude-sonnet-4-6":          {"cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0},
    # ── Google Gemini ─────────────────────────────────────────────────────
    "gemini-1.5-pro":             {"cost_input":  1.25, "cost_output":  5.00},
    "gemini-1.5-flash":           {"cost_input":  0.075,"cost_output":  0.30},
    "gemini-2.0-flash":           {"cost_input":  0.10, "cost_output":  0.40},
    "gemini-2.5-flash":           {"cost_input":  0.30, "cost_output":  2.50},
    "gemini-2.5-flash-lite":      {"cost_input":  0.10, "cost_output":  0.40},
    "gemini-2.5-pro":             {"cost_input":  1.25, "cost_output": 10.00, "copilot_multiplier": 1.0},
    # ── Groq ──────────────────────────────────────────────────────────────
    "llama3-70b-8192":            {"cost_input":  0.59, "cost_output":  0.79},
    "llama-3.3-70b-versatile":    {"cost_input":  0.59, "cost_output":  0.79},
    "llama-3.1-8b-instant":       {"cost_input":  0.05, "cost_output":  0.08},
    "llama-4-scout":              {"cost_input":  0.11, "cost_output":  0.34},
    "llama-4-maverick":           {"cost_input":  0.20, "cost_output":  0.60},
    "mixtral-8x7b-32768":         {"cost_input":  0.24, "cost_output":  0.24},
}

# Module-level in-memory cache (populated on first call to get_cached_pricing)
_mem_cache: Optional[Dict[str, Any]] = None


# ── Internal helpers ─────────────────────────────────────────────────────────

def _load_cache_file() -> Optional[Dict[str, Any]]:
    """Read the JSON cache file from disk. Returns the full payload dict or None."""
    try:
        if _CACHE_FILE.exists():
            return json.loads(_CACHE_FILE.read_text())
    except Exception as exc:
        logger.warning("Could not read pricing cache file: %s", exc)
    return None


def _cache_age(payload: Optional[Dict[str, Any]]) -> Optional[timedelta]:
    """Return age of a cache payload, or None if the timestamp is absent/invalid."""
    if not payload:
        return None
    try:
        ts_str = payload.get("updated_at", "")
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - ts
    except Exception:
        return None


def _is_stale(payload: Optional[Dict[str, Any]]) -> bool:
    age = _cache_age(payload)
    return age is None or age.total_seconds() > _CACHE_TTL_H * 3600


# ── Public API ───────────────────────────────────────────────────────────────

def get_cached_pricing() -> Dict[str, Dict[str, Any]]:
    """Return the best-known pricing dict.

    Uses the in-memory cache when available; falls back to a fresh cache file
    if it exists and is not older than ``_CACHE_TTL_H`` hours; otherwise falls
    back to the compiled-in ``STATIC_PRICING`` baseline.
    """
    global _mem_cache
    if _mem_cache is not None:
        return _mem_cache

    payload = _load_cache_file()
    if payload and not _is_stale(payload):
        # Merge: static is the base, cached overrides
        _mem_cache = {**STATIC_PRICING, **payload.get("pricing", {})}
    else:
        _mem_cache = dict(STATIC_PRICING)
    return _mem_cache


def get_pricing_updated_at() -> Optional[str]:
    """Return the ISO-8601 timestamp of the last cache write, or None."""
    payload = _load_cache_file()
    if payload:
        return payload.get("updated_at")
    return None


def get_pricing_age_hours() -> Optional[float]:
    """Return age of the on-disk cache in fractional hours, or None."""
    payload = _load_cache_file()
    age = _cache_age(payload)
    return age.total_seconds() / 3600 if age is not None else None


def _fetch_openrouter_pricing() -> Optional[Dict[str, Dict[str, Any]]]:
    """Fetch live token pricing from the OpenRouter public API.

    Returns a dict of ``{local_model_id: {cost_input, cost_output}}`` for
    every model that resolves via ``_OPENROUTER_ID_MAP``, or ``None`` on any
    network/parse failure.  Prices from OR are per-token (USD); we multiply
    by 1,000,000 to get $/1M format consistent with STATIC_PRICING.

    ``copilot_multiplier`` is intentionally NOT set here — that data lives
    only in STATIC_PRICING.
    """
    try:
        import requests as _requests  # lazy import; avoids hard dep at module load
        resp = _requests.get(_OPENROUTER_API_URL, timeout=_OPENROUTER_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("OpenRouter pricing fetch failed: %s", exc)
        return None

    # Build lookup: OR model_id → {cost_input, cost_output}
    or_index: Dict[str, Dict[str, Any]] = {}
    for model in data.get("data", []):
        mid     = model.get("id", "")
        pricing = model.get("pricing", {})
        try:
            cost_in  = float(pricing.get("prompt",     0)) * 1_000_000
            cost_out = float(pricing.get("completion", 0)) * 1_000_000
            if cost_in >= 0 and cost_out >= 0:   # skip special values like -1 (dynamic)
                or_index[mid] = {"cost_input": cost_in, "cost_output": cost_out}
        except (ValueError, TypeError):
            pass

    # Map internal IDs → OR IDs
    result: Dict[str, Dict[str, Any]] = {}
    for local_id, or_id in _OPENROUTER_ID_MAP.items():
        if or_id in or_index:
            result[local_id] = or_index[or_id]

    logger.info("OpenRouter: resolved %d / %d model prices",
                len(result), len(_OPENROUTER_ID_MAP))
    return result or None


def refresh_pricing_cache() -> Dict[str, Dict[str, Any]]:
    """Refresh pricing: fetch live token prices from OpenRouter, fall back to static.

    Merges live OpenRouter prices over the STATIC_PRICING baseline.
    ``copilot_multiplier`` values are always preserved from STATIC_PRICING
    because OpenRouter has no concept of GitHub Copilot billing tiers.

    Returns the refreshed pricing dict.
    """
    global _mem_cache
    with _refresh_lock:
        pricing    = dict(STATIC_PRICING)   # always start from the baseline
        source     = "static"
        live_count = 0

        live = _fetch_openrouter_pricing()
        if live:
            for model_id, live_data in live.items():
                existing = pricing.get(model_id, {})
                # Preserve copilot_multiplier; update token prices
                pricing[model_id] = {
                    **existing,
                    "cost_input":  live_data["cost_input"],
                    "cost_output": live_data["cost_output"],
                }
            source     = "openrouter"
            live_count = len(live)

        payload: Dict[str, Any] = {
            "updated_at":  datetime.now(timezone.utc).isoformat(),
            "source":      source,
            "live_count":  live_count,
            "pricing":     pricing,
        }
        try:
            _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            _CACHE_FILE.write_text(json.dumps(payload, indent=2))
            logger.info("Pricing cache written: source=%s, live_count=%d", source, live_count)
        except Exception as exc:
            logger.warning("Could not write pricing cache: %s", exc)
        _mem_cache = {**STATIC_PRICING, **pricing}
        return _mem_cache


def get_pricing_source() -> Optional[str]:
    """Return the source of the current cache: 'openrouter', 'static', or None."""
    payload = _load_cache_file()
    if payload:
        return payload.get("source")
    return None


def maybe_refresh_in_background() -> None:
    """Fire-and-forget background refresh if the cache file is stale."""
    payload = _load_cache_file()
    if _is_stale(payload):
        t = threading.Thread(
            target=refresh_pricing_cache,
            daemon=True,
            name="pricing-refresh",
        )
        t.start()
