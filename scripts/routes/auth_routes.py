# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Authentication routes — Copilot OAuth, model catalog, model get/set/test, pricing.
"""
import logging
import threading
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.llm_client import get_llm_provider, PROVIDER_MODELS, PROVIDER_BILLING, MODEL_INFO
from utils.pricing_cache import (
    get_cached_pricing, get_pricing_updated_at, get_pricing_source,
    refresh_pricing_cache, lookup_runtime_pricing_bulk, STATIC_PRICING,
)


def create_blueprint(deps):
    bp = Blueprint('auth', __name__)

    auth_manager = deps['auth_manager']
    _provider_name_ref = deps['provider_name_ref']   # mutable dict: {'value': str}
    _current_model_ref = deps['current_model_ref']   # mutable dict: {'value': Optional[str]}
    _llm_client_ref = deps['llm_client_ref']         # mutable dict: {'value': client}
    session_registry = deps['session_registry']
    _get_session = deps['get_session']
    _validate_owner = deps['validate_owner']
    _dynamic_model_cache = deps['dynamic_model_cache']
    _dynamic_model_cache_lock = deps['dynamic_model_cache_lock']
    _CATALOG_LIST_MODELS_CAPABLE = deps['catalog_list_models_capable']
    _catalog_discover_provider_models = deps['catalog_discover_provider_models']
    _get_available_models = deps['get_available_models']

    _auth_poll: dict = {"polling": False, "error": None, "device_code": None, "interval": 5}

    # ── Copilot OAuth ────────────────────────────────────────────────────────

    @bp.post("/api/copilot-auth/start")
    def copilot_auth_start():
        """Begin Device Flow: returns user_code + verification_uri for the user to open."""
        try:
            flow = auth_manager.start_device_flow()
            _auth_poll["device_code"] = flow["device_code"]
            _auth_poll["interval"]    = flow.get("interval", 5)
            _auth_poll["error"]       = None
            return jsonify({
                "user_code":        flow["user_code"],
                "verification_uri": flow["verification_uri"],
                "interval":         flow.get("interval", 5),
                "expires_in":       flow.get("expires_in", 900),
            })
        except Exception:
            logger.exception("Failed to start Copilot authentication")
            return jsonify({"error": "Failed to start Copilot authentication."}), 500

    @bp.post("/api/copilot-auth/poll")
    def copilot_auth_poll():
        """Start a background thread that polls GitHub until the user approves the device flow."""
        if _auth_poll["polling"]:
            return jsonify({"ok": True, "message": "Already polling"})
        device_code = _auth_poll.get("device_code")
        interval    = _auth_poll.get("interval", 5)
        if not device_code:
            return jsonify({"error": "No device flow in progress — call /start first"}), 400

        def _do_poll():
            _auth_poll["polling"] = True
            _auth_poll["error"]   = None
            try:
                auth_manager.complete_device_flow(device_code, interval)
            except Exception as exc:
                _auth_poll["error"] = str(exc)
            finally:
                _auth_poll["polling"] = False

        threading.Thread(target=_do_poll, daemon=True).start()
        return jsonify({"ok": True})

    @bp.get("/api/copilot-auth/status")
    def copilot_auth_status():
        """Return current auth state (authenticated, polling, error)."""
        return jsonify({
            **auth_manager.status,
            "polling": _auth_poll["polling"],
            "error":   _auth_poll["error"],
        })

    @bp.post("/api/copilot-auth/logout")
    def copilot_auth_logout():
        """Clear stored credentials."""
        auth_manager.logout()
        return jsonify({"ok": True})

    # ── Model selection ──────────────────────────────────────────────────────

    @bp.get("/api/model")
    def get_model():
        """Return current model, all provider models, and pricing metadata."""
        entry = _get_session(required=False, allow_missing=True)
        session_provider = None
        session_model = None
        if entry:
            conversation = entry.manager
            session_provider = conversation.state.get("provider")
            session_model = conversation.state.get("model")

        _provider_name = _provider_name_ref['value']
        _current_model = _current_model_ref['value']
        llm_client = _llm_client_ref['value']

        provider_for_view = session_provider or _provider_name
        current = session_model or _current_model or (llm_client.model if hasattr(llm_client, "model") else None)
        available = _get_available_models(provider_for_view, current_model=current)
        billing = PROVIDER_BILLING.get(provider_for_view, {"type": "per_token", "note": ""})
        live      = get_cached_pricing()
        models_with_info = [
            {
                "model":              m,
                "context_window":     MODEL_INFO.get(m, {}).get("context_window"),
                "cost_input":         (live.get(m) or MODEL_INFO.get(m, {})).get("cost_input"),
                "cost_output":        (live.get(m) or MODEL_INFO.get(m, {})).get("cost_output"),
                "copilot_multiplier": MODEL_INFO.get(m, {}).get("copilot_multiplier"),
                "notes":              MODEL_INFO.get(m, {}).get("notes", ""),
            }
            for m in available
        ]
        all_models = []
        for prov in PROVIDER_MODELS:
            prov_models       = _get_available_models(prov)
            prov_billing_type = PROVIDER_BILLING.get(prov, {}).get("type", "per_token")
            for m in prov_models:
                pricing = live.get(m) or MODEL_INFO.get(m, {})
                price_source = "static_baseline"
                all_models.append({
                    "provider":           prov,
                    "model":              m,
                    "source":             "list_models" if prov in _dynamic_model_cache else "fallback_static",
                    "price_source":       price_source,
                    "billing_type":       prov_billing_type,
                    "context_window":     MODEL_INFO.get(m, {}).get("context_window"),
                    "cost_input":         pricing.get("cost_input"),
                    "cost_output":        pricing.get("cost_output"),
                    "copilot_multiplier": MODEL_INFO.get(m, {}).get("copilot_multiplier"),
                    "notes":              MODEL_INFO.get(m, {}).get("notes", ""),
                })
        return jsonify({
            "provider":           provider_for_view,
            "providers":          sorted(PROVIDER_MODELS.keys()),
            "list_models_capable": ["openai", "anthropic", "gemini", "groq"],
            "billing_type":       billing["type"],
            "billing_note":       billing["note"],
            "model":              current,
            "available":          models_with_info,
            "all_models":         all_models,
            "pricing_updated_at": get_pricing_updated_at(),
            "pricing_source":     get_pricing_source(),
        })

    @bp.get("/api/model-catalog")
    def get_model_catalog():
        """Return model rows for selected providers."""
        list_models_capable = _CATALOG_LIST_MODELS_CAPABLE
        _provider_name = _provider_name_ref['value']

        selected_param = (request.args.get("providers") or "").strip()
        if selected_param:
            selected = [p.strip() for p in selected_param.split(",") if p.strip()]
        else:
            selected = [_provider_name]

        selected = [p for p in selected if p in PROVIDER_MODELS]
        if not selected:
            selected = [_provider_name]

        live = get_cached_pricing()
        rows: List[Dict[str, Any]] = []
        provider_sources: Dict[str, str] = {}
        provider_models: Dict[str, List[str]] = {}
        runtime_candidates: List = []

        for provider in selected:
            if provider in _dynamic_model_cache:
                discovered = _dynamic_model_cache[provider]
            else:
                discovered = _catalog_discover_provider_models(provider)
                if discovered:
                    with _dynamic_model_cache_lock:
                        _dynamic_model_cache[provider] = discovered
            if discovered:
                model_list = discovered
                provider_sources[provider] = "list_models"
                runtime_candidates.extend((provider, name) for name in model_list)
            else:
                model_list = PROVIDER_MODELS.get(provider, [])
                provider_sources[provider] = "fallback_static"
            provider_models[provider] = model_list

        runtime_prices = lookup_runtime_pricing_bulk(runtime_candidates, cached_pricing=live)

        for provider in selected:
            model_list = provider_models.get(provider, [])
            prov_billing_type = PROVIDER_BILLING.get(provider, {}).get("type", "per_token")
            for model_name in model_list:
                pricing = (
                    live.get(model_name)
                    or runtime_prices.get(model_name)
                    or MODEL_INFO.get(model_name, {})
                )
                if model_name in runtime_prices and model_name not in STATIC_PRICING:
                    price_source = "runtime_cache"
                else:
                    price_source = "static_baseline"
                base_notes = MODEL_INFO.get(model_name, {}).get("notes", "")
                if provider_sources[provider] == "list_models" and not base_notes:
                    base_notes = "Discovered via list_models"
                rows.append({
                    "provider":           provider,
                    "model":              model_name,
                    "source":             provider_sources[provider],
                    "price_source":       price_source,
                    "billing_type":       prov_billing_type,
                    "context_window":     MODEL_INFO.get(model_name, {}).get("context_window"),
                    "cost_input":         pricing.get("cost_input"),
                    "cost_output":        pricing.get("cost_output"),
                    "copilot_multiplier": MODEL_INFO.get(model_name, {}).get("copilot_multiplier"),
                    "notes":              base_notes,
                })

        return jsonify({
            "providers":            sorted(PROVIDER_MODELS.keys()),
            "selected_providers":   selected,
            "list_models_capable":  sorted(list(list_models_capable)),
            "provider_sources":     provider_sources,
            "all_models":           rows,
            "pricing_updated_at":   get_pricing_updated_at(),
            "pricing_source":       get_pricing_source(),
        })

    @bp.post("/api/model-pricing/refresh")
    def refresh_model_pricing():
        """Refresh the pricing cache."""
        pricing = refresh_pricing_cache()
        return jsonify({
            "ok":          True,
            "updated_at":  get_pricing_updated_at(),
            "source":      get_pricing_source(),
            "model_count": len(pricing),
        })

    @bp.post("/api/model")
    def set_model():
        """Switch the active model and optionally the provider."""
        def _format_probe_error(provider_name: str, probe_error: Optional[str]) -> str:
            _friendly_names: Dict[str, str] = {
                "github":       "GitHub Models",
                "openai":       "OpenAI",
                "anthropic":    "Anthropic",
                "copilot":      "Copilot",
                "copilot-oauth":"Copilot",
                "gemini":       "Gemini",
                "groq":         "Groq",
            }
            display = _friendly_names.get(provider_name, provider_name)
            if not probe_error:
                return f"{display} was unable to complete the model probe."

            friendly = probe_error.strip()
            if provider_name == "github":
                friendly = friendly.replace("with OpenAI", "with GitHub Models")
                friendly = friendly.replace("by OpenAI", "by GitHub Models")
                friendly = friendly.replace("(openai)", "(github)")
            return friendly

        def _probe_client(candidate_client):
            try:
                candidate_client.chat(
                    messages=[{"role": "user", "content": "Reply with one word: ready"}],
                    temperature=0,
                    max_tokens=8,
                )
                return True, None
            except Exception as exc:
                logger.warning("Model probe failed: %s", exc)
                return False, None

        data     = request.get_json(silent=True) or {}
        model    = data.get("model", "").strip()
        provider = (data.get("provider") or _provider_name_ref['value']).strip()
        if not model:
            return jsonify({"error": "Missing model"}), 400
        available = PROVIDER_MODELS.get(provider, [])
        static_only = {"copilot-oauth", "copilot", "github", "local"}
        if provider in static_only and available and model not in available:
            return jsonify({"error": f"Unknown model '{model}' for provider '{provider}'"}), 400
        try:
            candidate_client = get_llm_provider(provider=provider, model=model, auth_manager=auth_manager)
            ok, probe_error = _probe_client(candidate_client)
            if not ok:
                formatted_error = _format_probe_error(provider, probe_error)
                return jsonify({
                    "error": f"Model '{model}' is not currently available for provider '{provider}'. {formatted_error}",
                    "provider": provider,
                    "model": model,
                }), 400

            _llm_client_ref['value']     = candidate_client
            _provider_name_ref['value']  = provider
            _current_model_ref['value']  = model
            for _entry in session_registry.all_active():
                _entry.orchestrator.llm = candidate_client
                _entry.manager.llm = candidate_client

            entry = _get_session(required=False, allow_missing=True)
            if entry:
                try:
                    _validate_owner(entry)
                    conv = entry.manager
                    conv.state["provider"] = provider
                    conv.state["model"] = model
                    conv._save_session()
                    session_registry.touch(entry.session_id)
                except Exception:
                    pass

            return jsonify({"ok": True, "provider": provider, "model": model})
        except Exception:
            logger.exception("Failed to set model")
            return jsonify({"error": "Failed to set model."}), 500

    @bp.post("/api/model/test")
    def test_model():
        """Smoke-test the active LLM."""
        import time
        t0 = time.monotonic()
        llm_client = _llm_client_ref['value']
        _provider_name = _provider_name_ref['value']
        _current_model = _current_model_ref['value']
        try:
            llm_client.chat(
                messages=[{"role": "user", "content": "Reply with one word: ready"}],
            )
            latency_ms = round((time.monotonic() - t0) * 1000)
            return jsonify({
                "ok":         True,
                "provider":   _provider_name,
                "model":      _current_model,
                "latency_ms": latency_ms,
            })
        except Exception:
            logger.exception("Model test failed")
            return jsonify({
                "ok":       False,
                "error":    "Model test failed.",
                "provider": _provider_name,
                "model":    _current_model,
            }), 200

    return bp
