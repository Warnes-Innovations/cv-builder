"""
Unit tests for scripts/utils/cv_orchestrator.py

Tests the private helper methods independently of the LLM and web server:
  - _organize_skills_by_category
  - _format_publications
  - _prepare_cv_data_for_template  - _build_json_ld  - _render_cv_html_pdf (light smoke-test against real template)
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.cv_orchestrator import CVOrchestrator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

MINIMAL_MASTER_DATA = {
    'personal_info': {
        'name':  'Jane Doe',
        'title': 'Scientist',
        'contact': {
            'email':   'jane@example.com',
            'phone':   '5555551234',
            'linkedin': '',
            'github':   '',
            'address':  {'city': 'Boston', 'state': 'MA'},
        },
    },
    'experiences': [],
    'education':   [{'degree': 'PhD', 'institution': 'MIT', 'year': '2015'}],
    'skills':      [],
    'achievements': [],
    'awards':      [],
    'publications': [],
    'summaries':   [{'summary': 'Experienced scientist.', 'audience': []}],
}

SKILLS_STANDARD = [
    {'name': 'Python',          'category': 'Programming',   'years': 8},
    {'name': 'R',               'category': 'Programming',   'years': 5},
    {'name': 'TensorFlow',      'category': 'ML Frameworks', 'years': 3},
    {'name': 'Docker',          'category': 'Tools',         'years': 4},
    {'name': 'Linear Algebra',  'category': 'Core Expertise','years': 10},
    {'name': 'Galaxy',          'category': 'Bioinformatics','years': 2},
]


def _make_orchestrator(tmp_dir: Path) -> CVOrchestrator:
    """Create a CVOrchestrator instance wired to a temp directory."""
    master_path = tmp_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(MINIMAL_MASTER_DATA), encoding='utf-8')

    pubs_path = tmp_dir / 'publications.bib'
    pubs_path.touch()  # empty file is fine

    mock_llm = MagicMock()
    return CVOrchestrator(
        master_data_path  = str(master_path),
        publications_path = str(pubs_path),
        output_dir        = str(tmp_dir),
        llm_client        = mock_llm,
    )


# ---------------------------------------------------------------------------
# _organize_skills_by_category
# ---------------------------------------------------------------------------

class TestOrganizeSkillsByCategory(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_returns_list(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'standard')
        self.assertIsInstance(result, list)

    def test_each_item_has_category_and_skills_keys(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'standard')
        for item in result:
            self.assertIn('category', item)
            self.assertIn('skills',   item)

    def test_empty_input_returns_empty_list(self):
        result = self.orc._organize_skills_by_category([], 'standard')
        self.assertEqual(result, [])

    def test_standard_variant_core_expertise_first(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'standard')
        first_category = result[0]['category']
        self.assertEqual(first_category, 'Core Expertise')

    def test_technical_variant_programming_first(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'technical')
        first_category = result[0]['category']
        self.assertEqual(first_category, 'Programming')

    def test_non_priority_categories_appended_alphabetically(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'standard')
        # Categories not in the standard priority list should appear after priority ones
        categories = [item['category'] for item in result]
        # 'Bioinformatics' and 'ML Frameworks' are not in the standard priority list
        non_priority = [c for c in categories
                        if c not in ['Core Expertise', 'Programming', 'Technical', 'Tools', 'General']]
        # They should be in alphabetical order
        self.assertEqual(non_priority, sorted(non_priority))

    def test_skills_within_category_sorted_by_years_desc(self):
        result = self.orc._organize_skills_by_category(SKILLS_STANDARD, 'standard')
        prog = next(item for item in result if item['category'] == 'Programming')
        years_list = [s.get('years', 0) for s in prog['skills']]
        self.assertEqual(years_list, sorted(years_list, reverse=True))

    def test_single_skill(self):
        skills = [{'name': 'Python', 'category': 'Programming', 'years': 5}]
        result = self.orc._organize_skills_by_category(skills, 'standard')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['category'], 'Programming')

    def test_missing_category_key_defaults_to_general(self):
        skills = [{'name': 'Misc tool', 'years': 1}]
        result = self.orc._organize_skills_by_category(skills, 'standard')
        categories = [item['category'] for item in result]
        self.assertIn('General', categories)


# ---------------------------------------------------------------------------
# _format_publications
# ---------------------------------------------------------------------------

class TestFormatPublications(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_empty_list_returns_empty(self):
        self.assertEqual(self.orc._format_publications([]), [])

    def test_formatted_key_used_as_citation(self):
        pub = {'formatted': 'Doe et al. (2020). Great paper. Nature.'}
        result = self.orc._format_publications([pub])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['formatted_citation'], pub['formatted'])

    def test_title_based_citation_constructed(self):
        pub = {
            'title':   'Awesome Research',
            'authors': 'J. Doe',
            'journal': 'Science',
            'year':    '2021',
        }
        result = self.orc._format_publications([pub])
        self.assertEqual(len(result), 1)
        citation = result[0]['formatted_citation']
        self.assertIn('Awesome Research', citation)
        self.assertIn('J. Doe',           citation)
        self.assertIn('Science',          citation)
        self.assertIn('2021',             citation)

    def test_non_dict_items_skipped(self):
        pubs = ['not a dict', 42, None]
        result = self.orc._format_publications(pubs)
        self.assertEqual(result, [])

    def test_mixed_pubs_handled(self):
        pubs = [
            {'formatted': 'Pre-formatted citation'},
            {'title': 'Another Paper', 'authors': 'A. Smith', 'year': '2022'},
        ]
        result = self.orc._format_publications(pubs)
        self.assertEqual(len(result), 2)

    def test_result_always_has_formatted_citation_key(self):
        pubs = [{'title': 'T', 'authors': 'A', 'journal': 'J', 'year': '2020'}]
        result = self.orc._format_publications(pubs)
        self.assertIn('formatted_citation', result[0])


# ---------------------------------------------------------------------------
# _prepare_cv_data_for_template
# ---------------------------------------------------------------------------

class TestPrepareCvDataForTemplate(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def _selected(self, extra=None):
        base = {
            'personal_info': {
                'name': 'Jane Doe',
                'contact': {'email': 'jane@example.com'},
            },
            'summary':       'Experienced scientist.',
            'experiences':   [],
            'education':     [],
            'skills':        [],
            'awards':        [],
            'certifications': [],
            'publications':  [],
        }
        if extra:
            base.update(extra)
        return base

    def _job(self):
        return {'title': 'Data Scientist', 'company': 'Acme Corp'}

    def test_returns_dict(self):
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        self.assertIsInstance(result, dict)

    def test_languages_always_present(self):
        # personal_info without 'languages'
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        self.assertIn('languages', result['personal_info'])

    def test_languages_preserved_when_provided(self):
        sel = self._selected()
        sel['personal_info']['languages'] = [{'language': 'English', 'proficiency': 'Native'}]
        result = self.orc._prepare_cv_data_for_template(sel, self._job())
        self.assertEqual(len(result['personal_info']['languages']), 1)

    def test_skills_by_category_is_list(self):
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        self.assertIsInstance(result['skills_by_category'], list)

    def test_template_metadata_has_required_keys(self):
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        meta = result['template_metadata']
        for key in ('variant', 'generated_date', 'job_title', 'company'):
            self.assertIn(key, meta, f"Missing metadata key: {key}")

    def test_template_metadata_job_title_populated(self):
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        self.assertEqual(result['template_metadata']['job_title'], 'Data Scientist')

    def test_template_metadata_company_populated(self):
        result = self.orc._prepare_cv_data_for_template(self._selected(), self._job())
        self.assertEqual(result['template_metadata']['company'], 'Acme Corp')

    def test_empty_summary_gets_default(self):
        sel = self._selected({'summary': ''})
        result = self.orc._prepare_cv_data_for_template(sel, self._job())
        self.assertGreater(len(result['professional_summary']), 0)

    def test_address_display_added_when_address_present(self):
        sel = self._selected()
        sel['personal_info']['contact']['address'] = {'city': 'Boston', 'state': 'MA'}
        result = self.orc._prepare_cv_data_for_template(sel, self._job())
        self.assertEqual(result['personal_info']['contact']['address_display'], 'Boston, MA')


# ---------------------------------------------------------------------------
# _render_cv_html_pdf  (smoke test; skipped if template absent)
# ---------------------------------------------------------------------------

class TestRenderCvHtmlPdf(unittest.TestCase):
    """
    Light smoke-test of _render_cv_html_pdf using the real HTML template.
    Skipped automatically if cv-template.html is not found.
    """

    _TEMPLATE_PATH = (
        Path(__file__).parent.parent / 'templates' / 'cv-template.html'
    )

    def setUp(self):
        if not self._TEMPLATE_PATH.exists():
            self.skipTest('cv-template.html not found — skipping render smoke-test')
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        if hasattr(self, 'tmp'):
            self.tmp.cleanup()

    def _cv_data(self):
        return {
            'personal_info': {
                'name':  'Smoke Test User',
                'title': 'Test Engineer',
                'contact': {
                    'email':          'smoke@test.com',
                    'phone':          '5555550000',
                    'linkedin':       '',
                    'github':         '',
                    'address_display': 'Testville, TS',
                },
                'languages': [],
            },
            'professional_summary': 'Automated smoke test profile.',
            'experiences':        [],
            'education':          [],
            'skills_by_category': [],
            'awards':             [],
            'certifications':     [],
            'publications':       [],
            'achievements':       [],
            'template_metadata':  {
                'variant':        'standard',
                'generated_date': '2025-01-01',
                'job_title':      'Test Engineer',
                'company':        'Test Corp',
            },
            # JSON-LD is injected by _build_json_ld before rendering
            'json_ld_str': '{"@context": "https://schema.org", "@type": "Person", "name": "Smoke Test User"}',
        }

    def test_html_file_written(self):
        out_dir = Path(self.tmp.name) / 'output'
        self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        html_path = out_dir / 'smoke_test.html'
        self.assertTrue(html_path.exists(), 'Expected HTML output file to be created')

    def test_html_contains_name(self):
        out_dir = Path(self.tmp.name) / 'output'
        self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        html_content = (out_dir / 'smoke_test.html').read_text(encoding='utf-8')
        self.assertIn('Smoke Test User', html_content)

    def test_returns_tuple_of_html_and_pdf_paths(self):
        out_dir = Path(self.tmp.name) / 'output'
        result = self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)
        html_path, pdf_path = result
        self.assertEqual(html_path.name, 'smoke_test.html')
        self.assertEqual(pdf_path.name,  'smoke_test.pdf')

    def test_pdf_file_created(self):
        out_dir = Path(self.tmp.name) / 'output'
        _html_path, pdf_path = self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        self.assertTrue(pdf_path.exists(), 'Expected PDF file to be created')

    def test_html_contains_json_ld_block(self):
        out_dir = Path(self.tmp.name) / 'output'
        self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        html = (out_dir / 'smoke_test.html').read_text(encoding='utf-8')
        self.assertIn('<script type="application/ld+json">', html)

    def test_html_contains_hidden_plaintext_section(self):
        out_dir = Path(self.tmp.name) / 'output'
        self.orc._render_cv_html_pdf(self._cv_data(), out_dir, 'smoke_test')
        html = (out_dir / 'smoke_test.html').read_text(encoding='utf-8')
        self.assertIn('id="plaintext"', html)


# ---------------------------------------------------------------------------
# _build_json_ld
# ---------------------------------------------------------------------------

class TestBuildJsonLd(unittest.TestCase):
    """Tests for _build_json_ld — Schema.org/Person JSON-LD generation."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def _cv_data(self, **overrides):
        base = {
            'personal_info': {
                'name': 'Jane Doe',
                'contact': {
                    'email':           'jane@example.com',
                    'phone':           '5555551234',
                    'linkedin':        'https://linkedin.com/in/janedoe',
                    'website':         'https://janedoe.com',
                    'address_display': 'Boston, MA',
                },
                'languages': [],
            },
            'professional_summary': 'Experienced scientist.',
            'experiences': [
                {
                    'title':        'Staff Scientist',
                    'company':      'Acme Corp',
                    'start_date':   '2018-01',
                    'end_date':     'Present',
                    'achievements': ['Led genomics project'],
                    'location':     {'city': 'Boston', 'state': 'MA'},
                }
            ],
            'education': [
                {'degree': 'PhD', 'field': 'Chemistry', 'institution': 'MIT', 'end_year': '2015'}
            ],
            'skills_by_category': [
                {'category': 'Programming', 'skills': [{'name': 'Python'}, {'name': 'R'}]}
            ],
            'awards': [{'title': 'Best Paper', 'year': '2020'}],
        }
        base.update(overrides)
        return base

    def _job(self):
        return {'title': 'Senior Scientist', 'company': 'Acme Corp'}

    def _parse(self, cv_data=None, job=None):
        raw = self.orc._build_json_ld(cv_data or self._cv_data(), job or self._job())
        return json.loads(raw)  # must be valid JSON

    def test_returns_valid_json_string(self):
        raw = self.orc._build_json_ld(self._cv_data(), self._job())
        self.assertIsInstance(raw, str)
        parsed = json.loads(raw)          # raises if invalid
        self.assertIsInstance(parsed, dict)

    def test_schema_context_and_type(self):
        d = self._parse()
        self.assertEqual(d['@context'], 'https://schema.org')
        self.assertEqual(d['@type'],    'Person')

    def test_name_populated(self):
        d = self._parse()
        self.assertEqual(d['name'], 'Jane Doe')

    def test_job_title_populated(self):
        d = self._parse()
        self.assertEqual(d['jobTitle'], 'Senior Scientist')

    def test_email_and_phone_included(self):
        d = self._parse()
        self.assertEqual(d['email'],     'jane@example.com')
        self.assertEqual(d['telephone'], '5555551234')

    def test_same_as_contains_linkedin_and_website(self):
        d = self._parse()
        self.assertIn('https://linkedin.com/in/janedoe', d['sameAs'])
        self.assertIn('https://janedoe.com',             d['sameAs'])

    def test_address_locality_set(self):
        d = self._parse()
        self.assertEqual(d['address']['@type'],           'PostalAddress')
        self.assertEqual(d['address']['addressLocality'], 'Boston, MA')

    def test_has_occupation_matches_experiences(self):
        d = self._parse()
        self.assertEqual(len(d['hasOccupation']), 1)
        role = d['hasOccupation'][0]
        self.assertEqual(role['roleName'],  'Staff Scientist')
        self.assertEqual(role['name'],      'Acme Corp')
        self.assertEqual(role['startDate'], '2018-01')
        self.assertEqual(role['endDate'],   'Present')

    def test_has_occupation_location_embedded(self):
        d = self._parse()
        role = d['hasOccupation'][0]
        self.assertIn('locationCreated', role)
        addr = role['locationCreated']['address']
        self.assertEqual(addr['addressLocality'], 'Boston')
        self.assertEqual(addr['addressRegion'],   'MA')

    def test_has_occupation_description_from_achievements(self):
        d = self._parse()
        role = d['hasOccupation'][0]
        self.assertIn('Led genomics project', role.get('description', ''))

    def test_alumni_of_matches_education(self):
        d = self._parse()
        self.assertEqual(len(d['alumniOf']), 1)
        edu = d['alumniOf'][0]
        self.assertEqual(edu['@type'], 'EducationalOrganization')
        self.assertEqual(edu['name'],  'MIT')
        self.assertIn('PhD',           edu['description'])
        self.assertIn('Chemistry',     edu['description'])
        self.assertIn('2015',          edu['description'])

    def test_knows_about_contains_skills(self):
        d = self._parse()
        self.assertIn('Python', d['knowsAbout'])
        self.assertIn('R',      d['knowsAbout'])

    def test_award_strings_included(self):
        d = self._parse()
        self.assertTrue(any('Best Paper' in a for a in d['award']))

    def test_omits_empty_optional_fields(self):
        """Fields with no data must not appear in the output at all."""
        bare = {
            'personal_info': {
                'name': 'No Contact',
                'contact': {},
            },
            'professional_summary': '',
            'experiences':        [],
            'education':          [],
            'skills_by_category': [],
            'awards':             [],
        }
        d = self._parse(cv_data=bare)
        for key in ('email', 'telephone', 'sameAs', 'address',
                    'alumniOf', 'hasOccupation', 'knowsAbout', 'award'):
            self.assertNotIn(key, d, f"Key '{key}' should be absent when data is empty")


if __name__ == '__main__':
    unittest.main()
