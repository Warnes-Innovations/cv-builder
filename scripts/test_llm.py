#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Quick test script to verify LLM integration works
"""

import os
import sys

# Check for API keys
has_github = bool(os.getenv('GITHUB_MODELS_TOKEN'))
has_openai = bool(os.getenv('OPENAI_API_KEY'))
has_anthropic = bool(os.getenv('ANTHROPIC_API_KEY'))

print("LLM Integration Test")
print("=" * 50)
print(f"GitHub Models Token: {'✓ Set' if has_github else '✗ Not set'}")
print(f"OpenAI API Key: {'✓ Set' if has_openai else '✗ Not set'}")
print(f"Anthropic API Key: {'✓ Set' if has_anthropic else '✗ Not set'}")
print()

if not (has_github or has_openai or has_anthropic):
    print("⚠ No API keys found. Set one of:")
    print("  export GITHUB_MODELS_TOKEN='your-github-token'  # Recommended - uses Copilot subscription")
    print("  export OPENAI_API_KEY='your-key'")
    print("  export ANTHROPIC_API_KEY='your-key'")
    print()
    print("Or test with local model (requires ~4GB download first run)")
    sys.exit(0)

# Import our LLM client
from utils.llm_client import GitHubModelsClient, OpenAIClient, AnthropicClient

# Test GitHub Models if available
if has_github:
    print("Testing GitHub Models client...")
    try:
        client = GitHubModelsClient(model="gpt-4o")
        response = client.chat([
            {"role": "user", "content": "Say 'Hello, CV Generator!' in exactly those words."}
        ])
        print(f"✓ GitHub Models: {response}")
    except Exception as e:
        print(f"✗ GitHub Models error: {e}")
    print()

# Test Anthropic if available
if has_anthropic:
    print("Testing Anthropic client...")
    try:
        client = AnthropicClient(model="claude-3-opus-20240229")
        response = client.chat([
            {"role": "user", "content": "Say 'Hello, CV Generator!' in exactly those words."}
        ])
        print(f"✓ Anthropic: {response}")
    except Exception as e:
        print(f"✗ Anthropic error: {e}")
    print()

print("=" * 50)
print("Test complete! If you see checkmarks above, LLM integration is working.")
print()
print("Next steps:")
print("1. Run the main generator:")
print("   python scripts/llm_cv_generator.py")
print()
print("2. Or provide a job description:")
print("   python scripts/llm_cv_generator.py --job-file sample_job_description.txt")
