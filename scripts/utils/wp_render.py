# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Standalone WeasyPrint HTML-to-PDF renderer with local font substitution.

Called as a subprocess:
    python -m scripts.utils.wp_render <html_file> <pdf_output> [fonts_dir]

When fonts_dir is supplied and contains the expected WOFF2 files, the Google
Fonts CDN <link> is stripped and replaced with inline @font-face rules using
file:// URIs so WeasyPrint can generate PDFs without internet access.
"""

import re
import sys
from pathlib import Path

# (family, weight, style, filename-within-fonts_dir)
_FONT_SPECS = [
    ('Inter',        300, 'normal', 'Inter-Light.woff2'),
    ('Inter',        400, 'normal', 'Inter-Regular.woff2'),
    ('Inter',        600, 'normal', 'Inter-SemiBold.woff2'),
    ('Inter',        700, 'normal', 'Inter-Bold.woff2'),
    ('Merriweather', 300, 'normal', 'Merriweather-Light.woff2'),
    ('Merriweather', 400, 'normal', 'Merriweather-Regular.woff2'),
    ('Merriweather', 700, 'normal', 'Merriweather-Bold.woff2'),
    ('Merriweather', 300, 'italic', 'Merriweather-LightItalic.woff2'),
]

_GOOGLEAPIS_RE = re.compile(
    r'<link\b[^>]*fonts\.googleapis\.com[^>]*(?:/>|>)',
    re.IGNORECASE,
)


def _build_local_font_css(fonts_dir: Path) -> str:
    rules = []
    for family, weight, style, filename in _FONT_SPECS:
        path = fonts_dir / filename
        if path.exists():
            rules.append(
                f"@font-face{{font-family:'{family}';"
                f"font-weight:{weight};font-style:{style};"
                f"src:url('{path.as_uri()}')format('woff2')}}"
            )
    return ''.join(rules)


def render(html_file: str, pdf_output: str, fonts_dir: str | None = None) -> None:
    import weasyprint  # noqa: PLC0415

    html_path = Path(html_file)
    html = html_path.read_text(encoding='utf-8')

    if fonts_dir:
        css = _build_local_font_css(Path(fonts_dir))
        if css:
            html = _GOOGLEAPIS_RE.sub(f'<style>{css}</style>', html, count=1)

    weasyprint.HTML(
        string=html,
        base_url=html_path.as_uri(),
    ).write_pdf(pdf_output)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(
            'Usage: python -m scripts.utils.wp_render <html> <pdf> [fonts_dir]',
            file=sys.stderr,
        )
        sys.exit(1)
    render(*sys.argv[1:4])
