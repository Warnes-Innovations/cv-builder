# Copyright (C) 2024-2025 Gregory R. Warnes
# SPDX-License-Identifier: MIT
"""WSGI entry point for gunicorn in production deployments.

All configuration is read from environment variables and config.yaml.
No CLI argument parsing; args are resolved from the config singleton.
"""
import argparse
import sys
from pathlib import Path

# Mirror the sys.path manipulation in scripts/web_app.py so all relative
# imports inside the scripts/ package resolve identically.
_scripts_dir = str(Path(__file__).parent / "scripts")
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)

from utils.config import get_config, setup_logging  # noqa: E402
from web_app import create_app                      # noqa: E402

config = get_config()
setup_logging(config)

# Build a Namespace that matches what parse_args() produces so that
# create_app() receives the same interface it already expects.
_args = argparse.Namespace(
    llm_provider=config.llm_provider,
    model=config.llm_model,
    master_data=config.master_cv_path,
    publications=config.publications_path,
    output_dir=config.output_dir,
)

app = create_app(_args)
