#!/usr/bin/env python3
"""One-time setup script for LanguageTool (Phase 6 spell/grammar check).

Run this once after installing the cv-builder conda environment to pre-download
the LanguageTool Java jar (~200 MB).  Subsequent spell-check calls will start
instantly instead of downloading on first use.

Usage:
    conda activate cvgen
    python scripts/setup_languagetool.py
"""
import sys


def main() -> int:
    print("CV-Builder — LanguageTool Setup")
    print("=" * 40)

    # Check Java availability first
    import shutil
    if not shutil.which("java"):
        print("\nERROR: Java is not available on PATH.")
        print("LanguageTool requires Java 8 or later.")
        print("Install Java (e.g. 'brew install openjdk') then re-run this script.")
        return 1

    import subprocess
    result = subprocess.run(
        ["java", "-version"], capture_output=True, text=True
    )
    java_version_line = (result.stderr or result.stdout).splitlines()[0] if (result.stderr or result.stdout) else "unknown"
    print(f"Java detected: {java_version_line}")

    print("\nDownloading LanguageTool (~200 MB on first run)…")
    print("This may take a minute depending on your connection.\n")

    try:
        import language_tool_python  # noqa: F401 — triggers download if needed
    except ImportError:
        print("\nERROR: language-tool-python is not installed.")
        print("Run: conda run -n cvgen pip install language-tool-python>=3.3.0")
        return 1

    try:
        print("Initialising LanguageTool JVM (this starts a local Java process)…")
        tool = language_tool_python.LanguageTool("en-US")
        # Quick smoke test
        matches = tool.check("Ths is a tset sentense.")
        tool.close()
        print(f"\nLanguageTool ready. Smoke test: {len(matches)} suggestion(s) found.")
        print("\nSetup complete. The spell-check step will now start immediately.")
        return 0
    except Exception as exc:
        print(f"\nERROR initialising LanguageTool: {exc}")
        print("Check that Java is accessible and that you have internet access for the initial download.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
