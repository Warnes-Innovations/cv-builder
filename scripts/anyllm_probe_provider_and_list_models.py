#!/usr/bin/env python3
import json
import os
import re
import time
from pathlib import Path

from any_llm import completion, list_models
from dotenv import load_dotenv

BASE_URL = "https://models.inference.ai.azure.com"
PROVIDERS = ["openai", "azure", "azureopenai"]
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
    return "other_error"


def main() -> int:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    token = os.getenv("GITHUB_MODELS_TOKEN") or os.getenv("GITHUB_TOKEN")
    if not token:
        print(json.dumps({
            "ok": False,
            "error": "No GITHUB_MODELS_TOKEN or GITHUB_TOKEN in environment",
            "list_models": [],
            "completion": [],
        }, indent=2))
        return 0

    list_models_results = []
    for provider in PROVIDERS:
        t0 = time.time()
        try:
            models = list_models(
                provider=provider,
                api_key=token,
                api_base=BASE_URL,
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
    for provider in PROVIDERS:
        for model_name in MODEL_STYLES:
            t0 = time.time()
            try:
                response = completion(
                    provider=provider,
                    model=model_name,
                    api_key=token,
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
        "token_present": True,
        "providers_tested": PROVIDERS,
        "list_models": list_models_results,
        "completion": completion_results,
        "completion_pass_count": sum(1 for r in completion_results if r["status"] == "pass"),
        "completion_fail_count": sum(1 for r in completion_results if r["status"] == "fail"),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
