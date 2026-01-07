#!/bin/bash
# Helper script to set up GitHub token for CV generator

echo "🔧 GitHub Models Token Setup for CV Generator"
echo "==============================================="
echo ""
echo "This script will help you set up GitHub Models access for the CV generator."
echo "Note: Uses GITHUB_MODELS_TOKEN (separate from your regular GITHUB_TOKEN)"
echo ""

# Check if GITHUB_MODELS_TOKEN is already set
if [ -n "$GITHUB_MODELS_TOKEN" ]; then
    echo "✓ GITHUB_MODELS_TOKEN is already set in this session"
    echo ""
    read -p "Do you want to replace it? (y/N): " replace
    if [[ ! $replace =~ ^[Yy]$ ]]; then
        echo "Keeping existing token. You're ready to go!"
        exit 0
    fi
fi

echo "Step 1: Create a GitHub Personal Access Token"
echo "---------------------------------------------"
echo "1. Open: https://github.com/settings/tokens"
echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "3. Give it a name like 'CV Generator'"
echo "4. Select scope: 'read:user' (just need basic access)"
echo "5. Click 'Generate token' at the bottom"
echo "6. Copy the token (starts with 'ghp_')"
echo ""
echo "Opening GitHub token page in your browser..."
open "https://github.com/settings/tokens" 2>/dev/null || echo "Visit: https://github.com/settings/tokens"
echo ""

read -p "Press Enter when you have your token ready..."

echo ""
echo "Step 2: Enter your GitHub token"
echo "------------------------------"
read -sp "Paste your token here: " token
echo ""

if [ -z "$token" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Validate token format (should start with ghp_ or github_pat_)
if [[ ! $token =~ ^(ghp_|github_pat_) ]]; then
    echo "⚠️  Warning: Token doesn't look like a GitHub token (should start with 'ghp_' or 'github_pat_')"
    read -p "Continue anyway? (y/N): " continue
    if [[ ! $continue =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Export for current session
export GITHUB_MODELS_TOKEN="$token"

echo ""
echo "✓ Token set for current session!"
echo ""
echo "Step 3: Make it permanent (optional)"
echo "----------------------------------"
echo "To use this token in future terminal sessions, add it to your shell config:"
echo ""

# Detect shell
if [[ "$SHELL" == *"zsh"* ]]; then
    config_file="~/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    config_file="~/.bashrc"
else
    config_file="~/.profile"
fi

echo "Add this line to $config_file:"
echo ""
echo "export GITHUB_MODELS_TOKEN=\"$token\""
echo ""
read -p "Would you like me to add it automatically? (y/N): " auto_add

if [[ $auto_add =~ ^[Yy]$ ]]; then
    config_path="${config_file/#\~/$HOME}"
    echo "" >> "$config_path"
    echo "# GitHub Models token for CV generator" >> "$config_path"
    echo "export GITHUB_MODELS_TOKEN=\"$token\"" >> "$config_path"
    echo "✓ Added to $config_file"
    echo "Run 'source $config_file' to use in other terminals"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Test the connection: python scripts/test_llm.py"
echo "  2. Start generating CVs: python scripts/llm_cv_generator.py"
echo ""
