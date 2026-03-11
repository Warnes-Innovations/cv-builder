#!/usr/bin/env zsh
# Start the CV Builder web app with the correct environment and arguments.
# Usage: ./start.sh [--llm-provider PROVIDER] [--llm-model MODEL]
#   Defaults: provider=github, model from config.yaml

set -e

cd "$(dirname "$0")"

# Kill any process already listening on port 5001
existing=$(lsof -ti tcp:5001 2>/dev/null || true)
if [[ -n "$existing" ]]; then
  echo "Stopping process on port 5001 (PID $existing)..."
  kill $existing
  sleep 1
fi

exec conda run -n cvgen --no-capture-output python scripts/web_app.py --llm-provider 'github' "$@"
