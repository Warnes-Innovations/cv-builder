# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Smoke tests for scripts/utils/bibtex_parser.py

Covers:
  - parse_bibtex_file: article, inproceedings, misc entries
  - format_publication: apa, ieee, brief styles
  - filter_publications: by type, year, keywords
  - get_journal_articles / get_software_publications helpers
  - Empty .bib file (zero-entry)
  - Missing-field resilience
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.bibtex_parser import (
    parse_bibtex_file,
    format_publication,
    filter_publications,
    get_journal_articles,
    get_software_publications,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_BIB_CONTENT = r"""
@article{warnes2024ml,
  author  = {Warnes, Gregory R. and Smith, Jane A.},
  title   = {Machine Learning for Bioinformatics},
  journal = {Bioinformatics},
  year    = {2024},
  volume  = {40},
  pages   = {100--110},
}

@inproceedings{warnes2023nlp,
  author    = {Warnes, Gregory R.},
  title     = {Natural Language Processing in Genomics},
  booktitle = {Proceedings of ICML 2023},
  year      = {2023},
}

@misc{warnes2022pkg,
  author = {Warnes, Gregory R.},
  title  = {cvbuilder: A CV generation toolkit},
  year   = {2022},
  note   = {R package version 1.0},
  url    = {https://github.com/warnes/cvbuilder},
}

@article{warnes2020stats,
  author  = {Warnes, Gregory R.},
  title   = {Statistical Methods in Clinical Trials},
  journal = {Statistics in Medicine},
  year    = {2020},
  volume  = {39},
  pages   = {2001--2015},
}
"""

_BIB_MINIMAL = r"""
@article{minimal2000,
  title = {Minimal Article},
  year  = {2000},
}
"""


def _write_bib(content: str) -> str:
    """Write bib content to a temp file and return its path."""
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.bib', delete=False, encoding='utf-8')
    f.write(content)
    f.close()
    return f.name


# ---------------------------------------------------------------------------
# parse_bibtex_file
# ---------------------------------------------------------------------------

class TestParseBibtexFile(unittest.TestCase):

    def setUp(self):
        self.bib_path = _write_bib(_BIB_CONTENT)

    def tearDown(self):
        Path(self.bib_path).unlink(missing_ok=True)

    def test_returns_dict(self):
        result = parse_bibtex_file(self.bib_path)
        self.assertIsInstance(result, dict)

    def test_all_entries_present(self):
        result = parse_bibtex_file(self.bib_path)
        self.assertIn('warnes2024ml', result)
        self.assertIn('warnes2023nlp', result)
        self.assertIn('warnes2022pkg', result)
        self.assertIn('warnes2020stats', result)

    def test_article_fields(self):
        result = parse_bibtex_file(self.bib_path)
        art = result['warnes2024ml']
        self.assertEqual(art['type'], 'article')
        self.assertIn('Machine Learning', art['title'])
        self.assertEqual(art['year'], '2024')
        self.assertIn('journal', art)
        self.assertEqual(art['journal'], 'Bioinformatics')

    def test_inproceedings_fields(self):
        result = parse_bibtex_file(self.bib_path)
        proc = result['warnes2023nlp']
        self.assertEqual(proc['type'], 'inproceedings')
        self.assertIn('booktitle', proc)

    def test_misc_fields(self):
        result = parse_bibtex_file(self.bib_path)
        pkg = result['warnes2022pkg']
        self.assertEqual(pkg['type'], 'misc')
        self.assertIn('note', pkg)
        self.assertIn('url', pkg)

    def test_authors_string(self):
        result = parse_bibtex_file(self.bib_path)
        # Should be a non-empty string
        self.assertIsInstance(result['warnes2024ml']['authors'], str)
        self.assertTrue(len(result['warnes2024ml']['authors']) > 0)

    def test_key_echoed_in_entry(self):
        result = parse_bibtex_file(self.bib_path)
        self.assertEqual(result['warnes2024ml']['key'], 'warnes2024ml')

    def test_empty_bib_returns_empty_dict(self):
        empty_path = _write_bib('')
        try:
            result = parse_bibtex_file(empty_path)
            self.assertEqual(result, {})
        finally:
            Path(empty_path).unlink(missing_ok=True)

    def test_missing_optional_fields_no_crash(self):
        minimal_path = _write_bib(_BIB_MINIMAL)
        try:
            result = parse_bibtex_file(minimal_path)
            self.assertIn('minimal2000', result)
            entry = result['minimal2000']
            self.assertEqual(entry['title'], 'Minimal Article')
            self.assertEqual(entry['authors'], '')
        finally:
            Path(minimal_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# format_publication
# ---------------------------------------------------------------------------

class TestFormatPublication(unittest.TestCase):

    def setUp(self):
        bib_path = _write_bib(_BIB_CONTENT)
        self.pubs = parse_bibtex_file(bib_path)
        Path(bib_path).unlink(missing_ok=True)
        self.article = self.pubs['warnes2024ml']

    def test_default_style_returns_string(self):
        result = format_publication(self.article)
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_apa_contains_title(self):
        result = format_publication(self.article, style='apa')
        self.assertIn('Machine Learning', result)

    def test_apa_contains_year(self):
        result = format_publication(self.article, style='apa')
        self.assertIn('2024', result)

    def test_ieee_style(self):
        result = format_publication(self.article, style='ieee')
        self.assertIsInstance(result, str)
        self.assertIn('2024', result)

    def test_brief_style(self):
        result = format_publication(self.article, style='brief')
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_inproceedings_apa(self):
        proc = self.pubs['warnes2023nlp']
        result = format_publication(proc, style='apa')
        self.assertIn('2023', result)


# ---------------------------------------------------------------------------
# filter_publications
# ---------------------------------------------------------------------------

class TestFilterPublications(unittest.TestCase):

    def setUp(self):
        bib_path = _write_bib(_BIB_CONTENT)
        self.pubs = parse_bibtex_file(bib_path)
        Path(bib_path).unlink(missing_ok=True)

    def test_filter_by_type_article(self):
        result = filter_publications(self.pubs, pub_type='article',
                                     min_year=None, keywords=None)
        for pub in result.values():
            self.assertEqual(pub['type'], 'article')

    def test_filter_by_type_excludes_misc(self):
        result = filter_publications(self.pubs, pub_type='article',
                                     min_year=None, keywords=None)
        self.assertNotIn('warnes2022pkg', result)

    def test_filter_by_min_year(self):
        result = filter_publications(self.pubs, pub_type=None,
                                     min_year=2023, keywords=None)
        for pub in result.values():
            self.assertGreaterEqual(int(pub['year']), 2023)
        self.assertNotIn('warnes2020stats', result)

    def test_filter_by_keyword(self):
        result = filter_publications(self.pubs, pub_type=None,
                                     min_year=None, keywords=['Bioinformatics'])
        # At least one result with Bioinformatics in title or journal
        self.assertTrue(len(result) > 0)

    def test_no_filter_returns_all(self):
        result = filter_publications(self.pubs, pub_type=None,
                                     min_year=None, keywords=None)
        self.assertEqual(len(result), len(self.pubs))


# ---------------------------------------------------------------------------
# get_journal_articles / get_software_publications
# ---------------------------------------------------------------------------

class TestHelperFilters(unittest.TestCase):

    def setUp(self):
        bib_path = _write_bib(_BIB_CONTENT)
        self.pubs = parse_bibtex_file(bib_path)
        Path(bib_path).unlink(missing_ok=True)

    def test_get_journal_articles_type(self):
        result = get_journal_articles(self.pubs)
        for pub in result.values():
            self.assertEqual(pub['type'], 'article')

    def test_get_journal_articles_count(self):
        result = get_journal_articles(self.pubs)
        # Two articles in fixture
        self.assertEqual(len(result), 2)

    def test_get_software_publications_finds_package(self):
        result = get_software_publications(self.pubs)
        # warnes2022pkg has note containing 'package'
        self.assertIn('warnes2022pkg', result)

    def test_get_software_publications_excludes_articles(self):
        result = get_software_publications(self.pubs)
        self.assertNotIn('warnes2024ml', result)


if __name__ == '__main__':
    unittest.main()
