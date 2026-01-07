#!/usr/bin/env python3
"""
Quick reference for GitHub Models integration with CV Generator
"""

print("""
╔══════════════════════════════════════════════════════════════════╗
║  CV Generator - GitHub Models Integration Complete! 🎉           ║
╚══════════════════════════════════════════════════════════════════╝

✅ What's New:
  • GitHub Models added as default LLM provider
  • Uses your GitHub Copilot subscription (no extra cost!)
  • GPT-4o quality at 2-5 seconds per response
  • Perfect for your hardware (i7-9750H, 32GB RAM)

📋 Quick Start (5 minutes):
  
  1️⃣  Get GitHub Token:
      → Open: https://github.com/settings/tokens
      → Generate new token (classic)
      → Select scope: read:user
      → Copy token (starts with ghp_)
  
  2️⃣  Set Token:
      export GITHUB_MODELS_TOKEN="ghp_your_token_here"
      
      (Uses GITHUB_MODELS_TOKEN to avoid conflicts)
      Or run: ./scripts/setup_github_token.sh
  
  3️⃣  Test Connection:
      python scripts/test_llm.py
  
  4️⃣  Generate CV:
      python scripts/llm_cv_generator.py

📚 Documentation:
  • GITHUB_MODELS_SETUP.md - Setup guide
  • LLM_PROVIDER_COMPARISON.md - Provider comparison
  • README.md - Full documentation

⚙️  Available Providers:
  --llm-provider github     (default) ✓ Recommended for you
  --llm-provider openai     (needs API key, $15-25 per 50 CVs)
  --llm-provider anthropic  (needs API key, $40-70 per 50 CVs)  
  --llm-provider local      (free but slow: 30-90s per query)

💡 Why GitHub Models for you?
  ✓ Already have Copilot subscription
  ✓ $0 extra cost
  ✓ Fast (2-5s vs 30-90s for local)
  ✓ GPT-4o quality
  ✓ Simple setup

🚀 Next Steps:
  1. Run: ./scripts/setup_github_token.sh
  2. Test: python scripts/test_llm.py
  3. Generate: python scripts/llm_cv_generator.py

Need help? Check GITHUB_MODELS_SETUP.md
""")
