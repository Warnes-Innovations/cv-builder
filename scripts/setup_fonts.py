#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
One-time font downloader for offline WeasyPrint PDF generation.

Downloads Inter and Merriweather WOFF2 font files from jsDelivr (fontsource
mirror) into web/fonts/ so WeasyPrint can render PDFs without a live internet
connection (e.g. in Docker or air-gapped deployments).

Usage:
    python scripts/setup_fonts.py

The script is idempotent — it skips files that already exist.
"""

import sys
import urllib.request
from pathlib import Path

FONTS_DIR = Path(__file__).parent.parent / 'web' / 'fonts'

# jsDelivr mirrors @fontsource packages — stable predictable URLs
_BASE = 'https://cdn.jsdelivr.net/npm'
_FONT_URLS = [
    (
        f'{_BASE}/@fontsource/inter@5/files/inter-latin-300-normal.woff2',
        'Inter-Light.woff2',
    ),
    (
        f'{_BASE}/@fontsource/inter@5/files/inter-latin-400-normal.woff2',
        'Inter-Regular.woff2',
    ),
    (
        f'{_BASE}/@fontsource/inter@5/files/inter-latin-600-normal.woff2',
        'Inter-SemiBold.woff2',
    ),
    (
        f'{_BASE}/@fontsource/inter@5/files/inter-latin-700-normal.woff2',
        'Inter-Bold.woff2',
    ),
    (
        f'{_BASE}/@fontsource/merriweather@5/files/merriweather-latin-300-normal.woff2',
        'Merriweather-Light.woff2',
    ),
    (
        f'{_BASE}/@fontsource/merriweather@5/files/merriweather-latin-400-normal.woff2',
        'Merriweather-Regular.woff2',
    ),
    (
        f'{_BASE}/@fontsource/merriweather@5/files/merriweather-latin-700-normal.woff2',
        'Merriweather-Bold.woff2',
    ),
    (
        f'{_BASE}/@fontsource/merriweather@5/files/merriweather-latin-300-italic.woff2',
        'Merriweather-LightItalic.woff2',
    ),
]


def main() -> int:
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    failed = 0
    for url, filename in _FONT_URLS:
        dest = FONTS_DIR / filename
        if dest.exists():
            print(f'  skipping {filename} (already exists)')
            ok += 1
            continue
        try:
            print(f'  downloading {filename} …', end=' ', flush=True)
            urllib.request.urlretrieve(url, dest)
            size_kb = dest.stat().st_size // 1024
            print(f'{size_kb} KB')
            ok += 1
        except Exception as exc:
            print(f'FAILED: {exc}')
            if dest.exists():
                dest.unlink()
            failed += 1

    print(f'\n{ok} font(s) ready in {FONTS_DIR}')
    if failed:
        print(
            f'{failed} download(s) failed — WeasyPrint will fall back to CDN.',
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
