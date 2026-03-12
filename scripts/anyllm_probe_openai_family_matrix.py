#!/usr/bin/env python3
import json
import os
import time
from pathlib import Path

from any_llm import completion
from dotenv import load_dotenv

BASE_URL = "https://models.inference.ai.azure.com"
PROVIDERS = ["openai", "azure"]
MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo-preview",
    "gpt-3.5-turbo",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-5-mini",
    "o1-preview",
    "o1-mini",
]


def classify_error(msg: str) -> str:
    lower = msg.lower()
    if "unknown model" in lower:
        return "unknown_model"
    if "401" in lower or "unauthorized" in lower or "forbidden" in lower:
        return "auth_or_access"
    if "429" in lower or "rate" in lower:
        return "rate_limit"
    if "api version" in lower:
        return "api_version"
    return "other_error"


def probe(provider: str, model: str, token: str) -> dict:
    t0 = time.time()
    try:
        response = completion(
            provider=provider,
            model=model,
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
        return {
            "provider": provider,
            "model": model,
            "status": "pass",
            "latency_ms": elapsed_ms,
            "sample": sample,
            "error": None,
            "category": None,
        }
    except Exception as exc:
        elapsed_ms = int((time.time() - t0) * 1000)
        msg = str(exc)
        return {
            "provider": provider,
            "model": model,
            "status": "fail",
            "latency_ms": elapsed_ms,
            "sample": None,
            "error": msg,
            "category": classify_error(msg),
        }


def main() -> int:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    token = os.getenv("GITHUB_MODELS_TOKEN") or os.getenv("GITHUB_TOKEN")
    if not token:
        print(json.dumps({
            "ok": False,
            "error": "No GITHUB_MODELS_TOKEN or GITHUB_TOKEN in environment",
            "results": [],
        }, indent=2))
        return 0

    results = []
    for provider in PROVIDERS:
        for model in MODELS:
            results.append(probe(provider, model, token))

    safe_both = sorted(
        set(m for m in MODELS if all(
            any(r["provider"] == p and r["model"] == m and r["status"] == "pass" for r in results)
            for p in PROVIDERS
        ))
    )
    safe_openai_only = sorted(
        set(m for m in MODELS if any(r["provider"] == "openai" and r["model"] == m and r["status"] == "pass" for r in results))
    )
    safe_azure_only = sorted(
        set(m for m in MODELS if any(r["provider"] == "azure" and r["model"] == m and r["status"] == "pass" for r in results))
    )

    summary = {
        "ok": True,
        "base_url": BASE_URL,
        "providers": PROVIDERS,
        "models": MODELS,
        "pass_count": sum(1 for r in results if r["status"] == "pass"),
        "fail_count": sum(1 for r in results if r["status"] == "fail"),
        "safe_fallback": {
            "pass_on_both_providers": safe_both,
            "pass_on_openai_provider": safe_openai_only,
            "pass_on_azure_provider": safe_azure_only,
        },
        "results": results,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
