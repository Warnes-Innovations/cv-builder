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
    serialize_bibtex_entry,
    serialize_publications_to_bibtex,
    bibtex_text_to_publications,
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


# ---------------------------------------------------------------------------
# Round-trip fidelity: parse → serialize → parse
# ---------------------------------------------------------------------------

# A rich fixture that exercises every data-preservation concern:
#   - multi-author with von (lowercase particle) prefix
#   - author with lineage suffix (Jr.)
#   - editor-only entry (book)
#   - every common field: doi, url, volume, number, pages, note, isbn
#   - a custom field not in _STANDARD_FIELD_ORDER
_BIB_ROUNDTRIP = r"""
@article{rt_article,
  author  = {Warnes, Gregory R. and van der Berg, Pieter and Smith, Alice Jr.},
  title   = {Round-Trip Preservation Test},
  journal = {Journal of Testing},
  year    = {2024},
  volume  = {10},
  number  = {3},
  pages   = {1--42},
  doi     = {10.1234/rt.2024},
  url     = {https://example.com/paper},
  note    = {Special issue on testing},
  custom  = {my-custom-value},
}

@book{rt_book,
  editor    = {Jones, Alice and Brown, Robert J.},
  title     = {Handbook of Testing},
  publisher = {Test Press},
  year      = {2022},
  address   = {New York},
  isbn      = {978-0-000-00000-0},
}
"""


class TestRoundTrip(unittest.TestCase):
    """parse_bibtex_file → serialize_publications_to_bibtex → parse_bibtex_file
    must produce identical pub['fields'] dicts — no data loss.
    """

    def setUp(self):
        self.bib_path = _write_bib(_BIB_ROUNDTRIP)
        self.pubs_orig = parse_bibtex_file(self.bib_path)

        # Serialize and re-parse
        bib_text = serialize_publications_to_bibtex(self.pubs_orig)
        self.pubs_rt = bibtex_text_to_publications(bib_text)

    def tearDown(self):
        Path(self.bib_path).unlink(missing_ok=True)

    # --- author field not silently dropped ---------------------------------

    def test_author_field_present_after_roundtrip(self):
        """The author key must survive in fields after serialize → re-parse."""
        rt_article = self.pubs_rt['rt_article']
        self.assertIn('author', rt_article['fields'],
                      "'author' was lost from pub['fields'] during round-trip")
        self.assertTrue(rt_article['fields']['author'].strip())

    def test_all_author_last_names_present(self):
        """All three authors' last names must appear in the round-tripped author field."""
        author_str = self.pubs_rt['rt_article']['fields']['author']
        for last_name in ('Warnes', 'Berg', 'Smith'):
            self.assertIn(last_name, author_str,
                          f"Author last name '{last_name}' missing from: {author_str!r}")

    def test_von_particle_preserved(self):
        """'van der' von-part should appear in the reconstructed author string."""
        author_str = self.pubs_rt['rt_article']['fields']['author']
        # pybtex stores 'van' and 'der' as prelast_names; both must survive
        self.assertIn('van', author_str.lower(),
                      f"von particle 'van' missing from: {author_str!r}")

    # --- editor field not silently dropped ---------------------------------

    def test_editor_field_present_after_roundtrip(self):
        """The editor key must survive in fields for a book entry."""
        rt_book = self.pubs_rt['rt_book']
        self.assertIn('editor', rt_book['fields'],
                      "'editor' was lost from pub['fields'] during round-trip")
        self.assertTrue(rt_book['fields']['editor'].strip())

    def test_all_editor_last_names_present(self):
        """Both editors' last names must appear in the round-tripped editor field."""
        editor_str = self.pubs_rt['rt_book']['fields']['editor']
        for last_name in ('Jones', 'Brown'):
            self.assertIn(last_name, editor_str,
                          f"Editor last name '{last_name}' missing from: {editor_str!r}")

    # --- non-person fields exactly preserved --------------------------------

    def test_standard_fields_exact_match(self):
        """Every non-person field must survive with the same value."""
        for field in ('title', 'journal', 'year', 'volume', 'number',
                      'pages', 'doi', 'url', 'note'):
            orig_val = self.pubs_orig['rt_article']['fields'].get(field)
            rt_val   = self.pubs_rt  ['rt_article']['fields'].get(field)
            self.assertEqual(
                orig_val, rt_val,
                f"Field '{field}' changed: {orig_val!r} → {rt_val!r}",
            )

    def test_custom_field_preserved(self):
        """Fields outside _STANDARD_FIELD_ORDER must still survive."""
        self.assertEqual(
            self.pubs_rt['rt_article']['fields'].get('custom'),
            'my-custom-value',
        )

    def test_book_fields_exact_match(self):
        """Book standard fields must survive exactly."""
        for field in ('title', 'publisher', 'year', 'address', 'isbn'):
            orig_val = self.pubs_orig['rt_book']['fields'].get(field)
            rt_val   = self.pubs_rt  ['rt_book']['fields'].get(field)
            self.assertEqual(
                orig_val, rt_val,
                f"Book field '{field}' changed: {orig_val!r} → {rt_val!r}",
            )

    # --- entry type and key -------------------------------------------------

    def test_entry_types_preserved(self):
        self.assertEqual(self.pubs_rt['rt_article']['type'], 'article')
        self.assertEqual(self.pubs_rt['rt_book']['type'],    'book')

    def test_entry_keys_preserved(self):
        self.assertIn('rt_article', self.pubs_rt)
        self.assertIn('rt_book',    self.pubs_rt)

    # --- helper: serialize_bibtex_entry preview ----------------------------

    def test_serialize_single_entry_contains_author(self):
        """serialize_bibtex_entry output must contain the author string."""
        serialized = serialize_bibtex_entry(self.pubs_orig['rt_article'])
        self.assertIn('author', serialized)
        self.assertIn('Warnes', serialized)

    def test_serialize_entry_contains_all_fields(self):
        """serialize_bibtex_entry output must contain doi, pages, note."""
        serialized = serialize_bibtex_entry(self.pubs_orig['rt_article'])
        for field in ('doi', 'pages', 'note', 'custom'):
            self.assertIn(field, serialized,
                          f"Field '{field}' absent from serialized output")

    # --- double round-trip stability ---------------------------------------

    def test_double_roundtrip_stable(self):
        """A second parse → serialize → parse must give the same fields as the first."""
        bib_text2 = serialize_publications_to_bibtex(self.pubs_rt)
        pubs_rt2  = bibtex_text_to_publications(bib_text2)

        for key in ('rt_article', 'rt_book'):
            fields1 = self.pubs_rt [key]['fields']
            fields2 = pubs_rt2     [key]['fields']
            self.assertEqual(
                set(fields1.keys()), set(fields2.keys()),
                f"Field keys differ on second round-trip for '{key}'",
            )
            for fname, fval in fields1.items():
                self.assertEqual(
                    fval, fields2.get(fname),
                    f"Field '{fname}' of '{key}' changed on second round-trip: "
                    f"{fval!r} → {fields2.get(fname)!r}",
                )


# ---------------------------------------------------------------------------
# bibtex_text_to_publications — direct edge-case coverage
# ---------------------------------------------------------------------------

class TestBibtexTextToPublications(unittest.TestCase):
    """Direct tests for bibtex_text_to_publications edge cases."""

    def test_empty_string_returns_empty_dict(self):
        result = bibtex_text_to_publications('')
        self.assertEqual(result, {})

    def test_whitespace_only_returns_empty_dict(self):
        result = bibtex_text_to_publications('   \n\t  ')
        self.assertEqual(result, {})

    def test_none_input_returns_empty_dict(self):
        result = bibtex_text_to_publications(None)
        self.assertEqual(result, {})

    def test_invalid_bibtex_returns_empty_dict(self):
        result = bibtex_text_to_publications('this is not bibtex at all!')
        self.assertEqual(result, {})

    def test_write_failure_returns_empty_dict_not_unbound_error(self):
        """If the temp file write raises (e.g. disk full), must return {} not UnboundLocalError."""
        from unittest.mock import patch, MagicMock
        mock_file = MagicMock()
        mock_file.__enter__ = MagicMock(return_value=mock_file)
        mock_file.__exit__ = MagicMock(return_value=False)
        mock_file.write.side_effect = OSError('No space left on device')
        mock_file.name = '/tmp/fake.bib'
        with patch('tempfile.NamedTemporaryFile', return_value=mock_file):
            result = bibtex_text_to_publications('@article{x, title={T},}')
        self.assertEqual(result, {})

    def test_valid_minimal_entry_parses_correctly(self):
        bibtex = '@article{foo2024,\n  author = {Foo, Bar},\n  title = {A Test},\n  year = {2024},\n}\n'
        result = bibtex_text_to_publications(bibtex)
        self.assertIn('foo2024', result)
        self.assertEqual(result['foo2024']['type'], 'article')
        self.assertEqual(result['foo2024']['fields'].get('title'), 'A Test')
        self.assertIn('author', result['foo2024']['fields'])


# ---------------------------------------------------------------------------
# serialize_publications_to_bibtex — edge cases
# ---------------------------------------------------------------------------

class TestSerializePublicationsEdgeCases(unittest.TestCase):
    """Edge-case coverage for serialize_publications_to_bibtex."""

    def test_empty_dict_does_not_crash(self):
        """Serializing an empty publications dict must not raise."""
        result = serialize_publications_to_bibtex({})
        self.assertIsInstance(result, str)

    def test_year_sort_order_newest_first(self):
        """Entries should be written in descending year order."""
        pubs = {
            'old': {'key': 'old', 'type': 'article', 'fields': {'title': 'Old', 'year': '2010'}},
            'new': {'key': 'new', 'type': 'article', 'fields': {'title': 'New', 'year': '2024'}},
            'mid': {'key': 'mid', 'type': 'article', 'fields': {'title': 'Mid', 'year': '2018'}},
        }
        result = serialize_publications_to_bibtex(pubs)
        pos_new = result.index('@article{new,')
        pos_mid = result.index('@article{mid,')
        pos_old = result.index('@article{old,')
        self.assertLess(pos_new, pos_mid, "2024 entry should appear before 2018")
        self.assertLess(pos_mid, pos_old, "2018 entry should appear before 2010")

    def test_non_numeric_year_does_not_crash(self):
        """Entries with non-numeric year values must not raise."""
        pubs = {
            'weird': {'key': 'weird', 'type': 'misc', 'fields': {'title': 'Weird', 'year': 'forthcoming'}},
        }
        result = serialize_publications_to_bibtex(pubs)
        self.assertIn('@misc{weird,', result)


if __name__ == '__main__':
    unittest.main()
