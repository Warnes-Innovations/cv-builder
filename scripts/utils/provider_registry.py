# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Provider registry — single source of truth for all LLM provider metadata.

Each entry combines two categories of fields:

Credential / auth fields (used by status_routes for key storage and wizard auth steps):
  auth_type   — "api_key" | "device_flow" | "cli" | "none"
  config_key  — dotted key path in config.yaml (empty string when not applicable)
  env_var     — environment variable name for the API key (empty string when not applicable)
  label       — human-readable credential label shown in the wizard auth step
  get_key_url — URL where the user can obtain a key / token
  help_text   — wizard auth step instructions (plain text)

Display fields (served by GET /api/providers for the frontend provider selector):
  free_tier   — True when a no-cost API entry tier is available
  confidential — True when the provider commits not to train on API request data
  note        — one-sentence description shown in the provider selector popover
  homepage    — provider landing page URL (None when not applicable)
  pricing_url — pricing / plans page URL (None when not applicable)
  privacy_url — privacy policy or data-use policy URL (None when not applicable)

To add a new provider: add a single entry here with all fields populated.
"""

from typing import Any, Dict, Optional, Set

PROVIDER_REGISTRY: Dict[str, Dict[str, Any]] = {
    "github": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.github_token",
        "env_var":     "GITHUB_MODELS_TOKEN",
        "label":       "GitHub Personal Access Token (PAT)",
        "get_key_url": "https://github.com/settings/tokens",
        "help_text":   (
            "Create a fine-grained PAT with the 'read:user' scope, or a Classic token "
            "with 'read:user' and 'models:read'. Paste the token value below."
        ),
        # display
        "free_tier":    True,
        "confidential": True,
        "note":         (
            "GitHub Models API powered by Azure AI. Free tier available (rate-limited). "
            "API requests are not used for model training."
        ),
        "homepage":     "https://github.com/marketplace/models",
        "pricing_url":  "https://github.com/features/models",
        "privacy_url":  "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
    },
    "copilot": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.github_token",
        "env_var":     "GITHUB_MODELS_TOKEN",
        "label":       "GitHub Personal Access Token (PAT)",
        "get_key_url": "https://github.com/settings/tokens",
        "help_text":   (
            "Copilot provider uses the same GitHub PAT as the 'github' provider. "
            "If you already set it for 'github', you are done."
        ),
        # display
        "free_tier":    False,
        "confidential": True,
        "note":         (
            "GitHub Copilot \u2014 same Azure-hosted models as the github provider. "
            "Requires a paid Copilot Individual/Business subscription. "
            "API requests are not used for training."
        ),
        "homepage":     "https://github.com/features/copilot",
        "pricing_url":  "https://github.com/features/copilot#pricing",
        "privacy_url":  "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
    },
    "copilot-oauth": {
        # credential / auth
        "auth_type":   "device_flow",
        "config_key":  "",
        "env_var":     "",
        "label":       "GitHub Copilot (OAuth Device Flow)",
        "get_key_url": "https://github.com/login/device",
        "help_text":   (
            "Click 'Start Sign-In' below, enter the code shown at github.com/login/device, "
            "then return here. No token is stored in config.yaml \u2014 the session token is "
            "cached by the app."
        ),
        # display
        "free_tier":    False,
        "confidential": True,
        "note":         (
            "GitHub Copilot via browser OAuth \u2014 authenticates with your GitHub account. "
            "Requires an active Copilot subscription. No API key stored."
        ),
        "homepage":     "https://github.com/features/copilot",
        "pricing_url":  "https://github.com/features/copilot#pricing",
        "privacy_url":  "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
    },
    "copilot-sdk": {
        # credential / auth
        "auth_type":   "cli",
        "config_key":  "",
        "env_var":     "",
        "label":       "GitHub CLI (gh auth login)",
        "get_key_url": "https://cli.github.com/",
        "help_text":   (
            "copilot-sdk uses the GitHub CLI token. "
            "Run 'gh auth login' in a terminal, then return here and test the connection."
        ),
        # display
        "free_tier":    False,
        "confidential": True,
        "note":         (
            "GitHub Copilot via the GitHub CLI (gh auth login). "
            "Requires an active Copilot subscription. No separate API key needed."
        ),
        "homepage":     "https://cli.github.com/",
        "pricing_url":  "https://github.com/features/copilot#pricing",
        "privacy_url":  "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
    },
    "openai": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.openai_api_key",
        "env_var":     "OPENAI_API_KEY",
        "label":       "OpenAI API Key",
        "get_key_url": "https://platform.openai.com/api-keys",
        "help_text":   "Create a secret key in the OpenAI dashboard and paste it below.",
        # display
        "free_tier":    False,
        "confidential": True,
        "note":         (
            "OpenAI \u2014 creator of the GPT model family. Pay-as-you-go pricing; no free API tier. "
            "API data is not used for training by default per OpenAI API policy."
        ),
        "homepage":     "https://openai.com",
        "pricing_url":  "https://openai.com/api/pricing",
        "privacy_url":  "https://openai.com/policies/privacy-policy",
    },
    "anthropic": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.anthropic_api_key",
        "env_var":     "ANTHROPIC_API_KEY",
        "label":       "Anthropic API Key",
        "get_key_url": "https://console.anthropic.com/settings/keys",
        "help_text":   "Generate an API key in the Anthropic Console and paste it below.",
        # display
        "free_tier":    False,
        "confidential": True,
        "note":         (
            "Anthropic \u2014 creator of the Claude model family. Pay-as-you-go pricing; no free API tier. "
            "API requests are not used to train models."
        ),
        "homepage":     "https://anthropic.com",
        "pricing_url":  "https://www.anthropic.com/pricing",
        "privacy_url":  "https://www.anthropic.com/privacy",
    },
    "gemini": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.gemini_api_key",
        "env_var":     "GEMINI_API_KEY",
        "label":       "Google AI API Key",
        "get_key_url": "https://aistudio.google.com/app/apikey",
        "help_text":   "Create an API key in Google AI Studio and paste it below.",
        # display
        "free_tier":    True,
        "confidential": False,
        "note":         (
            "Google Gemini \u2014 Google AI Studio / Vertex AI. Free tier available. "
            "Free-tier prompts may be reviewed by Google; paid Vertex AI offers full confidentiality."
        ),
        "homepage":     "https://ai.google.dev",
        "pricing_url":  "https://ai.google.dev/pricing",
        "privacy_url":  "https://policies.google.com/privacy",
    },
    "groq": {
        # credential / auth
        "auth_type":   "api_key",
        "config_key":  "api_keys.groq_api_key",
        "env_var":     "GROQ_API_KEY",
        "label":       "Groq API Key",
        "get_key_url": "https://console.groq.com/keys",
        "help_text":   "Create a free API key at console.groq.com and paste it below.",
        # display
        "free_tier":    True,
        "confidential": False,
        "note":         (
            "Groq \u2014 ultra-fast inference on open-source models (Llama, Mixtral) via custom LPU hardware. "
            "Generous free tier. Review Groq privacy policy for data retention details."
        ),
        "homepage":     "https://groq.com",
        "pricing_url":  "https://groq.com/pricing",
        "privacy_url":  "https://groq.com/privacy-policy",
    },
    "local": {
        # credential / auth
        "auth_type":   "none",
        "config_key":  "",
        "env_var":     "",
        "label":       "Local model \u2014 no API key required",
        "get_key_url": "",
        "help_text":   "Local models run on your machine and do not require an API key.",
        # display
        "free_tier":    True,
        "confidential": True,
        "note":         (
            "Local model running entirely on your machine. "
            "No data leaves your device. Completely private. No API key or account required."
        ),
        "homepage":     None,
        "pricing_url":  None,
        "privacy_url":  None,
    },
}

# Field-set constants used by routes to slice the registry without hard-coded strings.
CREDENTIAL_FIELDS: Set[str] = {"auth_type", "config_key", "env_var", "label", "get_key_url", "help_text"}
DISPLAY_FIELDS:    Set[str] = {"free_tier", "confidential", "note", "homepage", "pricing_url", "privacy_url"}


def get_credential_meta(provider: str) -> Optional[Dict[str, Any]]:
    """Return the credential-relevant fields for a provider, or None if unknown."""
    entry = PROVIDER_REGISTRY.get(provider)
    if entry is None:
        return None
    return {k: entry[k] for k in CREDENTIAL_FIELDS}


def get_display_meta(provider: str) -> Optional[Dict[str, Any]]:
    """Return the display-only fields for a provider, or None if unknown."""
    entry = PROVIDER_REGISTRY.get(provider)
    if entry is None:
        return None
    return {k: entry[k] for k in DISPLAY_FIELDS}
