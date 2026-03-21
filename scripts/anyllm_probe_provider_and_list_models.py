#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

import json
import os
import re
import time
from pathlib import Path

from any_llm import completion, list_models
from dotenv import load_dotenv

BASE_URL = "https://models.inference.ai.azure.com"
LIST_MODELS_PROVIDERS = ["openai", "azure", "azureopenai", "gemini"]
COMPLETION_PROVIDERS = ["openai", "azure", "azureopenai"]
MODEL_STYLES = [
    "openai/gpt-4o",
    "gpt-4o",
    "anthropic/claude-sonnet-4.6",
    "claude-sonnet-4.6",
]


def _sanitize(msg: str) -> str:
    # Mask GitHub PAT-like strings if echoed in error messages.
    return re.sub(r"ghp_[A-Za-z0-9_]{10,}", "ghp_***", msg)


def _classify_error(msg: str) -> str:
    lower = msg.lower()
    if "unknown model" in lower:
        return "unknown_model"
    if "401" in lower or "unauthorized" in lower or "forbidden" in lower or "invalid_api_key" in lower:
        return "auth_or_access"
    if "429" in lower or "rate" in lower:
        return "rate_limit"
    if "provider" in lower and "unknown" in lower:
        return "unknown_provider"
    if "credential" in lower or "api key" in lower:
        return "missing_credentials"
    return "other_error"


def main() -> int:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    github_token = os.getenv("GITHUB_MODELS_TOKEN") or os.getenv("GITHUB_TOKEN")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not github_token and not gemini_key:
        print(json.dumps({
            "ok": False,
            "error": "No GitHub or Gemini credentials found in environment",
            "list_models": [],
            "completion": [],
        }, indent=2))
        return 0

    list_models_results = []
    for provider in LIST_MODELS_PROVIDERS:
        if provider == "gemini":
            provider_key = gemini_key
            provider_base = None
        else:
            provider_key = github_token
            provider_base = BASE_URL

        if not provider_key:
            list_models_results.append({
                "provider": provider,
                "status": "skipped",
                "latency_ms": 0,
                "count": 0,
                "sample_models": [],
                "error": "Missing credentials for this provider",
                "category": "missing_credentials",
            })
            continue

        t0 = time.time()
        try:
            call_kwargs = {
                "provider": provider,
                "api_key": provider_key,
            }
            if provider_base:
                call_kwargs["api_base"] = provider_base

            models = list_models(
                **call_kwargs,
            )
            elapsed_ms = int((time.time() - t0) * 1000)
            model_ids = [getattr(m, "id", str(m)) for m in models][:25]
            list_models_results.append({
                "provider": provider,
                "status": "pass",
                "latency_ms": elapsed_ms,
                "count": len(models),
                "sample_models": model_ids,
                "error": None,
                "category": None,
            })
        except Exception as exc:
            elapsed_ms = int((time.time() - t0) * 1000)
            msg = _sanitize(str(exc))
            list_models_results.append({
                "provider": provider,
                "status": "fail",
                "latency_ms": elapsed_ms,
                "count": 0,
                "sample_models": [],
                "error": msg,
                "category": _classify_error(msg),
            })

    completion_results = []
    if github_token:
        for provider in COMPLETION_PROVIDERS:
            for model_name in MODEL_STYLES:
                t0 = time.time()
                try:
                    response = completion(
                        provider=provider,
                        model=model_name,
                        api_key=github_token,
                        api_base=BASE_URL,
                        messages=[{"role": "user", "content": "Reply with exactly: ready"}],
                        max_tokens=8,
                        temperature=0,
                    )
                    elapsed_ms = int((time.time() - t0) * 1000)
                    sample = None
                    try:
                        sample = response.choices[0].message.content
                    except Exception:
                        sample = str(response)[:120]
                    completion_results.append({
                        "provider": provider,
                        "model": model_name,
                        "status": "pass",
                        "latency_ms": elapsed_ms,
                        "sample": sample,
                        "error": None,
                        "category": None,
                    })
                except Exception as exc:
                    elapsed_ms = int((time.time() - t0) * 1000)
                    msg = _sanitize(str(exc))
                    completion_results.append({
                        "provider": provider,
                        "model": model_name,
                        "status": "fail",
                        "latency_ms": elapsed_ms,
                        "sample": None,
                        "error": msg,
                        "category": _classify_error(msg),
                    })

    summary = {
        "ok": True,
        "base_url": BASE_URL,
        "credentials_present": {
            "github": bool(github_token),
            "gemini": bool(gemini_key),
        },
        "providers_tested": {
            "list_models": LIST_MODELS_PROVIDERS,
            "completion": COMPLETION_PROVIDERS,
        },
        "list_models": list_models_results,
        "completion": completion_results,
        "completion_pass_count": sum(1 for r in completion_results if r["status"] == "pass"),
        "completion_fail_count": sum(1 for r in completion_results if r["status"] == "fail"),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
