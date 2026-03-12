#!/usr/bin/env python3
import json
import os
import time
from pathlib import Path

from any_llm import completion
from dotenv import load_dotenv

BASE_URL = "https://models.inference.ai.azure.com"

MODELS = {
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-3-7-sonnet": "anthropic/claude-3-7-sonnet",
    "claude-3-5-sonnet": "anthropic/claude-3-5-sonnet",
    "claude-3-haiku": "anthropic/claude-3-haiku",
    "claude-3-opus": "anthropic/claude-3-opus",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "gpt-4-turbo-preview": "openai/gpt-4-turbo-preview",
    "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "o1-preview": "openai/o1-preview",
    "o1-mini": "openai/o1-mini",
}


def classify_error(msg: str) -> str:
    lower = msg.lower()
    if "unknown model" in lower:
        return "unknown_model"
    if "401" in lower or "unauthorized" in lower or "forbidden" in lower:
        return "auth_or_access"
    if "429" in lower or "rate" in lower:
        return "rate_limit"
    return "other_error"


def main() -> int:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    token = os.getenv("GITHUB_MODELS_TOKEN") or os.getenv("GITHUB_TOKEN")
    if not token:
        print(json.dumps({"ok": False, "error": "missing token", "results": []}, indent=2))
        return 0

    results = []
    for short_name, model_id in MODELS.items():
        bare_name = model_id.split("/", 1)[1] if "/" in model_id else model_id
        t0 = time.time()
        try:
            response = completion(
                provider="openai",
                model=bare_name,
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
            results.append({
                "model": short_name,
                "call_model": bare_name,
                "status": "pass",
                "latency_ms": elapsed_ms,
                "sample": sample,
                "error": None,
            })
        except Exception as exc:
            elapsed_ms = int((time.time() - t0) * 1000)
            msg = str(exc)
            results.append({
                "model": short_name,
                "call_model": bare_name,
                "status": "fail",
                "latency_ms": elapsed_ms,
                "sample": None,
                "error": msg,
                "category": classify_error(msg),
            })

    summary = {
        "ok": True,
        "base_url": BASE_URL,
        "pass_count": sum(1 for r in results if r["status"] == "pass"),
        "fail_count": sum(1 for r in results if r["status"] == "fail"),
        "results": results,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
