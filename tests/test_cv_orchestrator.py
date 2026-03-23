# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

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
# apply_accepted_spell_fixes
# ---------------------------------------------------------------------------

class TestApplyAcceptedSpellFixes(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_summary_fix_applied_by_offset(self):
        content = {'summary': 'Experienced scientst.', 'experiences': []}
        audit = [{
            'section_id': 'summary',
            'outcome': 'accept',
            'original': 'scientst',
            'final': 'scientist',
            'offset': 12,
            'length': 8,
        }]

        result = self.orc.apply_accepted_spell_fixes(content, audit)

        self.assertEqual(result['summary'], 'Experienced scientist.')
        self.assertEqual(content['summary'], 'Experienced scientst.')

    def test_bullet_fix_applied_to_ordered_and_base_achievements(self):
        content = {
            'summary': '',
            'experiences': [{
                'id': 'exp_001',
                'achievements': [{'text': 'Built dashbaords for executives.'}],
                'ordered_achievements': [{'text': 'Built dashbaords for executives.'}],
            }],
        }
        audit = [{
            'section_id': 'exp_exp_001_ach_0',
            'outcome': 'accept',
            'original': 'dashbaords',
            'final': 'dashboards',
            'offset': 6,
            'length': 10,
        }]

        result = self.orc.apply_accepted_spell_fixes(content, audit)

        self.assertEqual(
            result['experiences'][0]['achievements'][0]['text'],
            'Built dashboards for executives.',
        )
        self.assertEqual(
            result['experiences'][0]['ordered_achievements'][0]['text'],
            'Built dashboards for executives.',
        )

    def test_rejected_fix_is_ignored(self):
        content = {'summary': 'Experienced scientst.', 'experiences': []}
        audit = [{
            'section_id': 'summary',
            'outcome': 'reject',
            'original': 'scientst',
            'final': 'scientist',
            'offset': 12,
            'length': 8,
        }]

        result = self.orc.apply_accepted_spell_fixes(content, audit)

        self.assertEqual(result['summary'], 'Experienced scientst.')


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
        self.assertEqual(result['personal_info']['languages'], ['English (Native)'])

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

    def test_selected_achievements_are_normalized_to_text_field(self):
        sel = self._selected({
            'achievements': [
                {
                    'id': 'sa_001',
                    'title': 'Selected publication impact',
                    'description': 'Created widely used R packages with 7,000+ citations.',
                }
            ]
        })

        result = self.orc._prepare_cv_data_for_template(sel, self._job())

        self.assertEqual(len(result['achievements']), 1)
        self.assertEqual(
            result['achievements'][0]['text'],
            'Created widely used R packages with 7,000+ citations.',
        )

    def test_experience_achievements_are_normalized_to_text_field(self):
        sel = self._selected({
            'experiences': [
                {
                    'id': 'exp_001',
                    'company': 'Acme Corp',
                    'title': 'Scientist',
                    'achievements': [
                        {
                            'title': 'Pipeline automation',
                            'description': 'Automated QC reporting for clinical datasets.',
                        }
                    ],
                }
            ]
        })

        result = self.orc._prepare_cv_data_for_template(sel, self._job())

        self.assertEqual(
            result['experiences'][0]['achievements'][0]['text'],
            'Automated QC reporting for clinical datasets.',
        )


# ---------------------------------------------------------------------------
# _render_cv_html_pdf  (smoke test; skipped if template absent)
# ---------------------------------------------------------------------------

class TestRenderCvHtmlPdf(unittest.TestCase):
    """
    Light smoke-test of _render_cv_html_pdf using the real HTML template.
    Skipped automatically if cv-template.html is not found.
    WeasyPrint is mocked to avoid CDN fetches (Google Fonts) in CI/offline.
    """

    _TEMPLATE_PATH = (
        Path(__file__).parent.parent / 'templates' / 'cv-template.html'
    )

    def setUp(self):
        if not self._TEMPLATE_PATH.exists():
            self.skipTest('cv-template.html not found — skipping render smoke-test')
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

        # Patch WeasyPrint to write minimal PDF bytes (avoids CDN/network timeouts)
        def _fake_write_pdf(path, *args, **kwargs):
            Path(path).write_bytes(b'%PDF-1.4\n%%EOF\n')

        self._wp_patcher = patch('utils.cv_orchestrator.weasyprint.HTML')
        mock_html = self._wp_patcher.start()
        mock_html.return_value.write_pdf.side_effect = _fake_write_pdf

    def tearDown(self):
        self._wp_patcher.stop()
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


# ---------------------------------------------------------------------------
# apply_approved_rewrites  (Phase 2, tasks 2.2.1–2.2.6)
# ---------------------------------------------------------------------------

#: Minimal selected-content dict used by the rewrite tests.
_REWRITE_CONTENT = {
    'summary': 'Experienced data scientist with 8 years of model-building.',
    'experiences': [
        {
            'id': 'exp_001',
            'title': 'Senior Data Scientist',
            'company': 'Pfizer',
            'achievements': [
                {'text': 'Built a model to predict clinical trial outcomes'},
                {'text': 'Managed a team of 12 engineers at Pfizer in 2021'},
            ],
        },
        {
            'id': 'exp_002',
            'title': 'Data Scientist',
            'company': 'BioTech',
            'achievements': [
                {'text': 'Improved accuracy from 85% to 96% using ensemble methods'},
            ],
        },
    ],
    'skills': [
        {'name': 'Python',     'category': 'Programming', 'years': 8},
        {'name': 'R',          'category': 'Programming', 'years': 5},
        {'name': 'TensorFlow', 'category': 'ML Frameworks', 'years': 3},
    ],
}


class TestApplyApprovedRewrites(unittest.TestCase):
    """Unit tests for CVOrchestrator.apply_approved_rewrites."""

    def setUp(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.orch = _make_orchestrator(Path(tmp))

    def _apply(self, approved: list) -> dict:
        return self.orch.apply_approved_rewrites(_REWRITE_CONTENT, approved)

    # ── 2.2.6 (a) bullet apply ───────────────────────────────────────────

    def test_bullet_rewrite_applied(self):
        """Approved bullet rewrite replaces the achievement text."""
        approved = [{
            'id':       'bullet_exp001_0',
            'type':     'bullet',
            'location': 'exp_001.achievements[0]',
            'original': 'Built a model to predict clinical trial outcomes',
            'proposed': 'Developed a machine learning pipeline to predict '
                        'clinical trial outcomes',
            'keywords_introduced': ['machine learning pipeline'],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'Adds ML pipeline keyword.',
        }]
        result = self._apply(approved)
        ach_text = result['experiences'][0]['achievements'][0]['text']
        self.assertIn('machine learning pipeline', ach_text)
        self.assertNotIn('Built a model', ach_text)

    def test_bullet_rewrite_does_not_mutate_original(self):
        """apply_approved_rewrites must return a deep copy; original unchanged."""
        approved = [{
            'id':       'bullet_exp002_0',
            'type':     'bullet',
            'location': 'exp_002.achievements[0]',
            'original': 'Improved accuracy from 85% to 96% using ensemble methods',
            'proposed': 'Improved model accuracy from 85% to 96% using MLOps '
                        'and ensemble methods',
            'keywords_introduced': ['MLOps'],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'Adds MLOps keyword while preserving all metrics.',
        }]
        _ = self._apply(approved)
        # Original content must be unchanged
        self.assertEqual(
            _REWRITE_CONTENT['experiences'][1]['achievements'][0]['text'],
            'Improved accuracy from 85% to 96% using ensemble methods',
        )

    # ── 2.2.6 (b) skill rename ───────────────────────────────────────────

    def test_skill_rename_updates_name(self):
        """skill_rename changes the matching skill's display name."""
        approved = [{
            'id':       'skill_tensorflow',
            'type':     'skill_rename',
            'location': 'skills[2]',
            'original': 'TensorFlow',
            'proposed': 'TensorFlow / Keras',
            'keywords_introduced': ['Keras'],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'More specific to job requirements.',
        }]
        result   = self._apply(approved)
        names    = [s['name'] for s in result['skills']]
        self.assertIn('TensorFlow / Keras', names)
        self.assertNotIn('TensorFlow', names)

    def test_skill_rename_missing_original_logs_warning(self):
        """skill_rename for a non-existent name does not raise; others unaffected."""
        approved = [{
            'id':       'skill_nonexistent',
            'type':     'skill_rename',
            'location': 'skills[99]',
            'original': 'NoSuchSkill',
            'proposed': 'BetterName',
            'keywords_introduced': [],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'n/a',
        }]
        # Should not raise; original skills untouched
        result = self._apply(approved)
        names  = [s['name'] for s in result['skills']]
        self.assertIn('Python', names)
        self.assertIn('TensorFlow', names)

    # ── 2.2.6 (c) skill add (strong evidence) ───────────────────────────

    def test_skill_add_strong_no_confirm_flag(self):
        """skill_add with strong evidence should NOT set candidate_to_confirm."""
        approved = [{
            'id':       'skill_mlops',
            'type':     'skill_add',
            'location': 'skills.core',
            'original': '',
            'proposed': 'MLOps',
            'keywords_introduced': ['MLOps'],
            'evidence':           'exp_001, exp_002',
            'evidence_strength':  'strong',
            'rationale':          'Demonstrates MLOps in production.',
        }]
        result      = self._apply(approved)
        new_skill   = next(
            (s for s in result['skills'] if s.get('name') == 'MLOps'), None
        )
        self.assertIsNotNone(new_skill, "New skill 'MLOps' should be added")
        self.assertFalse(
            new_skill.get('candidate_to_confirm', False),
            "Strong evidence should not flag candidate_to_confirm",
        )

    # ── 2.2.6 (d) skill add (weak evidence → candidate flag) ────────────

    def test_skill_add_weak_sets_confirm_flag(self):
        """skill_add with weak evidence must set candidate_to_confirm: True."""
        approved = [{
            'id':       'skill_kubernetes',
            'type':     'skill_add',
            'location': 'skills.core',
            'original': '',
            'proposed': 'Kubernetes',
            'keywords_introduced': ['Kubernetes'],
            'evidence':           'exp_001',
            'evidence_strength':  'weak',
            'rationale':          'Limited Kubernetes exposure in exp_001.',
        }]
        result    = self._apply(approved)
        new_skill = next(
            (s for s in result['skills'] if s.get('name') == 'Kubernetes'), None
        )
        self.assertIsNotNone(new_skill, "New skill 'Kubernetes' should be added")
        self.assertTrue(
            new_skill.get('candidate_to_confirm'),
            "Weak evidence should set candidate_to_confirm: True",
        )

    # ── 2.2.6 (e) constraint violation skip ─────────────────────────────

    def test_constraint_violation_skipped(self):
        """Rewrite that drops a number/company name is skipped entirely."""
        # This removes "12" and "Pfizer" and "2021" from the original.
        approved = [{
            'id':       'bullet_exp001_1',
            'type':     'bullet',
            'location': 'exp_001.achievements[1]',
            'original': 'Managed a team of 12 engineers at Pfizer in 2021',
            'proposed': 'Led an engineering team using Agile methodologies',
            'keywords_introduced': ['Agile'],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'Introduces Agile keyword.',
        }]
        result   = self._apply(approved)
        ach_text = result['experiences'][0]['achievements'][1]['text']
        # Text should be UNCHANGED
        self.assertEqual(
            ach_text,
            'Managed a team of 12 engineers at Pfizer in 2021',
            "Constraint-violating rewrite must not be applied",
        )

    # ── summary rewrite ──────────────────────────────────────────────────

    def test_summary_rewrite_applied(self):
        """Summary rewrite replaces content['summary']."""
        approved = [{
            'id':       'summary',
            'type':     'summary',
            'location': 'summary',
            'original': 'Experienced data scientist with 8 years of model-building.',
            'proposed': 'Experienced ML engineer with 8 years of model-building '
                        'and MLOps expertise.',
            'keywords_introduced': ['ML engineer', 'MLOps'],
            'evidence': '',
            'evidence_strength': '',
            'rationale': 'Aligns title with job posting.',
        }]
        result = self._apply(approved)
        self.assertIn('MLOps', result['summary'])

    # ── empty approved list ──────────────────────────────────────────────

    def test_empty_approved_returns_deep_copy(self):
        """No rewrites → content is returned as-is (deep copy, not same object)."""
        result = self._apply([])
        self.assertEqual(result['summary'], _REWRITE_CONTENT['summary'])
        self.assertIsNot(result, _REWRITE_CONTENT)


# ---------------------------------------------------------------------------
# CVOrchestrator.propose_rewrites  (Phase 2, task 2.1.1)
# ---------------------------------------------------------------------------

class TestOrchestratorProposeRewrites(unittest.TestCase):
    """propose_rewrites delegates to self.llm and degrades when llm is None."""

    def test_delegates_to_llm(self):
        """When an LLM is configured, propose_rewrites calls llm.propose_rewrites."""
        with tempfile.TemporaryDirectory() as tmp:
            orch = _make_orchestrator(Path(tmp))
            orch.llm.propose_rewrites = MagicMock(return_value=[{'id': 'x'}])
            result = orch.propose_rewrites(_REWRITE_CONTENT, {'ats_keywords': []})
        self.assertEqual(result, [{'id': 'x'}])
        orch.llm.propose_rewrites.assert_called_once()

    def test_returns_empty_when_no_llm(self):
        """When llm is None, propose_rewrites returns [] without raising."""
        with tempfile.TemporaryDirectory() as tmp:
            orch     = _make_orchestrator(Path(tmp))
            orch.llm = None
            result   = orch.propose_rewrites(_REWRITE_CONTENT, {'ats_keywords': []})
        self.assertEqual(result, [])


# ---------------------------------------------------------------------------
# Phase 9 — Synonym map / canonical_skill_name
# ---------------------------------------------------------------------------

class TestSynonymMap(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_canonical_known_abbreviation(self):
        # 'ML' should expand to 'Machine Learning'
        result = self.orc.canonical_skill_name('ML')
        self.assertEqual(result, 'Machine Learning')

    def test_canonical_known_alias_case_insensitive(self):
        result = self.orc.canonical_skill_name('ml')
        self.assertEqual(result, 'Machine Learning')

    def test_canonical_full_form_returns_itself(self):
        result = self.orc.canonical_skill_name('Machine Learning')
        self.assertEqual(result, 'Machine Learning')

    def test_canonical_unknown_term_returned_unchanged(self):
        result = self.orc.canonical_skill_name('QuantumFoo')
        self.assertEqual(result, 'QuantumFoo')

    def test_synonym_map_is_dict(self):
        self.assertIsInstance(self.orc._synonym_map, dict)

    def test_synonym_map_non_empty(self):
        self.assertGreater(len(self.orc._synonym_map), 0)

    def test_expansion_index_covers_canonicals(self):
        # Every canonical value should be immediately retrievable
        for canonical in self.orc._synonym_map.values():
            self.assertIn(canonical.lower(), self.orc._expansion_index)


class TestOptimizeSkillsWithSynonyms(unittest.TestCase):
    """_optimize_skills_for_ats should match via synonym expansion."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_abbreviation_matches_keyword(self):
        # Skill named 'ML' should score when ATS keyword is 'Machine Learning'
        skills = [{'name': 'ML', 'years': 3}]
        job    = {'ats_keywords': ['Machine Learning'], 'required_skills': []}
        result = self.orc._optimize_skills_for_ats(skills, job)
        self.assertIn('ML', result)
        # Score must be > 0 (synonym match)
        self.assertGreater(len(result), 0)

    def test_full_form_matches_abbreviated_keyword(self):
        # Skill named 'Natural Language Processing' should match keyword 'NLP'
        skills = [{'name': 'Natural Language Processing', 'years': 2}]
        job    = {'ats_keywords': ['NLP'], 'required_skills': []}
        result = self.orc._optimize_skills_for_ats(skills, job)
        self.assertIn('Natural Language Processing', result)

    def test_synonym_match_outranks_unmatched(self):
        skills = [
            {'name': 'ML',   'years': 0},
            {'name': 'Misc', 'years': 0},
        ]
        job    = {'ats_keywords': ['Machine Learning'], 'required_skills': []}
        result = self.orc._optimize_skills_for_ats(skills, job)
        # ML should rank ahead of Misc
        self.assertLess(result.index('ML'), result.index('Misc'))

    def test_years_bonus_still_applied(self):
        # Without keyword match, years bonus should still affect order
        skills = [
            {'name': 'Python', 'years': 10},
            {'name': 'R',      'years': 1},
        ]
        job    = {'ats_keywords': [], 'required_skills': []}
        result = self.orc._optimize_skills_for_ats(skills, job)
        self.assertLess(result.index('Python'), result.index('R'))


class TestOrganizeSkillsAlias(unittest.TestCase):
    """_organize_skills_by_category should deduplicate via canonical synonym name."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_duplicate_alias_and_canonical_merged(self):
        # 'ML' and 'Machine Learning' should be merged into one entry
        skills = [
            {'name': 'ML',               'category': 'General', 'years': 5},
            {'name': 'Machine Learning', 'category': 'General', 'years': 3},
        ]
        result = self.orc._organize_skills_by_category(skills, 'standard')
        all_names = [s['name'] for cat in result for s in cat['skills']]
        # Only one entry should remain
        self.assertEqual(len(all_names), 1)

    def test_merged_entry_keeps_higher_years(self):
        skills = [
            {'name': 'ML',               'category': 'General', 'years': 5},
            {'name': 'Machine Learning', 'category': 'General', 'years': 3},
        ]
        result  = self.orc._organize_skills_by_category(skills, 'standard')
        merged  = result[0]['skills'][0]
        self.assertEqual(merged.get('years'), 5)

    def test_merged_entry_has_alias_list(self):
        skills = [
            {'name': 'ML',               'category': 'General', 'years': 2},
            {'name': 'Machine Learning', 'category': 'General', 'years': 1},
        ]
        result  = self.orc._organize_skills_by_category(skills, 'standard')
        merged  = result[0]['skills'][0]
        aliases = merged.get('aliases', [])
        self.assertIsInstance(aliases, list)
        self.assertGreater(len(aliases), 0)

    def test_no_deduplication_when_no_synonym(self):
        skills = [
            {'name': 'Python', 'category': 'Programming', 'years': 5},
            {'name': 'R',      'category': 'Programming', 'years': 3},
        ]
        result    = self.orc._organize_skills_by_category(skills, 'standard')
        all_names = [s['name'] for cat in result for s in cat['skills']]
        self.assertEqual(len(all_names), 2)

    def test_existing_aliases_field_preserved(self):
        # A skill that already has aliases in the data should keep them
        skills = [{'name': 'Python', 'category': 'General', 'years': 5,
                   'aliases': ['py', 'python3']}]
        result  = self.orc._organize_skills_by_category(skills, 'standard')
        merged  = result[0]['skills'][0]
        aliases = merged.get('aliases', [])
        # 'py' and 'python3' should still be present (py is also in synonym map)
        self.assertIn('python3', aliases)


class TestGroupInlineSkills(unittest.TestCase):
    """_group_inline_skills should combine skills sharing the same group key."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_grouped_skills_merge_into_one_entry(self):
        skills = [
            {'name': 'C++',  'group': 'c_family', 'category': 'Programming'},
            {'name': 'Rcpp', 'group': 'c_family', 'category': 'Programming'},
        ]
        result = self.orc._group_inline_skills(skills)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['group_names'], ['C++', 'Rcpp'])

    def test_ungrouped_skills_pass_through_unchanged(self):
        skills = [
            {'name': 'Python', 'category': 'Programming'},
            {'name': 'R',      'category': 'Programming'},
        ]
        result = self.orc._group_inline_skills(skills)
        self.assertEqual(len(result), 2)
        self.assertNotIn('group_names', result[0])

    def test_mixed_grouped_and_ungrouped(self):
        skills = [
            {'name': 'Python', 'category': 'Programming'},
            {'name': 'C++',    'group': 'c_family', 'category': 'Programming'},
            {'name': 'Rcpp',   'group': 'c_family', 'category': 'Programming'},
            {'name': 'R',      'category': 'Programming'},
        ]
        result = self.orc._group_inline_skills(skills)
        self.assertEqual(len(result), 3)
        grouped = next(s for s in result if s.get('group_names'))
        self.assertEqual(grouped['group_names'], ['C++', 'Rcpp'])

    def test_empty_group_key_not_grouped(self):
        skills = [
            {'name': 'Python', 'group': '', 'category': 'Programming'},
            {'name': 'R',      'group': '', 'category': 'Programming'},
        ]
        result = self.orc._group_inline_skills(skills)
        self.assertEqual(len(result), 2)
        self.assertNotIn('group_names', result[0])

    def test_group_entry_position_is_first_member(self):
        skills = [
            {'name': 'Go',   'category': 'Programming'},
            {'name': 'C++',  'group': 'c_fam', 'category': 'Programming'},
            {'name': 'Rcpp', 'group': 'c_fam', 'category': 'Programming'},
        ]
        result = self.orc._group_inline_skills(skills)
        self.assertEqual(result[0]['name'], 'Go')
        self.assertEqual(result[1]['group_names'], ['C++', 'Rcpp'])

    def test_organize_by_category_applies_grouping(self):
        skills = [
            {'name': 'C++',  'group': 'c_family', 'category': 'General'},
            {'name': 'Rcpp', 'group': 'c_family', 'category': 'General'},
            {'name': 'R',    'category': 'General'},
        ]
        result = self.orc._organize_skills_by_category(skills, 'standard')
        cat_skills = result[0]['skills']
        group_names_lists = [s.get('group_names') for s in cat_skills if s.get('group_names')]
        self.assertEqual(len(group_names_lists), 1)
        self.assertIn('C++', group_names_lists[0])
        self.assertIn('Rcpp', group_names_lists[0])


class TestBulletOrderInSelectContent(unittest.TestCase):
    """_select_content_hybrid should add ordered_achievements sorted by relevance."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))
        # Override master data with experiences that have multiple achievements
        self.orc.master_data['experience'] = [
            {
                'id':           'exp_k1',
                'title':        'Data Scientist',
                'company':      'Acme',
                'start_date':   '2020-01',
                'end_date':     'Present',
                'achievements': [
                    {'text': 'Managed internal admin processes'},       # low relevance
                    {'text': 'Built machine learning pipeline for ATS'},  # high relevance
                    {'text': 'Attended quarterly review meetings'},     # low relevance
                ],
            }
        ]
        self.orc.master_data['selected_achievements'] = []
        self.orc.master_data['skills'] = []

    def tearDown(self):
        self.tmp.cleanup()

    def _run(self, customizations=None):
        job = {
            'ats_keywords':         ['machine learning', 'ATS'],
            'required_skills':      [],
            'must_have_requirements':   [],
            'nice_to_have_requirements': [],
            'domain':               '',
        }
        self.orc.llm.semantic_match.return_value = 0.0
        return self.orc._select_content_hybrid(job, customizations or {})

    def test_ordered_achievements_present(self):
        result = self._run()
        exp    = result['experiences'][0]
        self.assertIn('ordered_achievements', exp)

    def test_high_relevance_bullet_first(self):
        result     = self._run()
        exp        = result['experiences'][0]
        first_text = exp['ordered_achievements'][0].get('text', '')
        self.assertIn('machine learning', first_text.lower())

    def test_user_order_overrides_auto_sort(self):
        # Explicit order [0, 1, 2] (original order) should be respected
        custom     = {'achievement_orders': {'exp_k1': [0, 1, 2]}}
        result     = self._run(custom)
        exp        = result['experiences'][0]
        first_text = exp['ordered_achievements'][0].get('text', '')
        # First bullet in original order is the low-relevance one
        self.assertIn('admin', first_text.lower())

    def test_empty_achievements_no_key_added(self):
        self.orc.master_data['experience'][0]['achievements'] = []
        result  = self._run()
        exp     = result['experiences'][0]
        # ordered_achievements may or may not be present but must not raise
        self.assertNotIn('ordered_achievements', exp)


class TestCheckPersuasion(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orc = _make_orchestrator(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_empty_experiences_returns_zero_summary(self):
        result = self.orc.check_persuasion([])

        self.assertEqual(result['findings'], [])
        self.assertEqual(
            result['summary'],
            {'total_bullets': 0, 'flagged': 0, 'strong_count': 0},
        )

    def test_strong_quantified_bullet_counts_as_strong(self):
        experiences = [
            {
                'id': 'exp-1',
                'achievements': [
                    'Led team of 5 engineers to reduce latency by 30% across platform.',
                ],
            }
        ]

        result = self.orc.check_persuasion(experiences)

        self.assertEqual(result['findings'], [])
        self.assertEqual(result['summary']['total_bullets'], 1)
        self.assertEqual(result['summary']['flagged'], 0)
        self.assertEqual(result['summary']['strong_count'], 1)

    def test_ordered_achievements_take_precedence_and_flag_warning_issues(self):
        experiences = [
            {
                'id': 'exp-2',
                'achievements': [
                    {'text': 'Led 10 engineers to improve reliability by 25%.'},
                ],
                'ordered_achievements': [
                    {'text': 'Helped with various tasks across the platform team.'},
                ],
            }
        ]

        result = self.orc.check_persuasion(experiences)

        self.assertEqual(result['summary']['total_bullets'], 1)
        self.assertEqual(result['summary']['flagged'], 1)
        self.assertEqual(result['summary']['strong_count'], 0)
        finding = result['findings'][0]
        self.assertEqual(finding['exp_id'], 'exp-2')
        self.assertEqual(
            finding['text'],
            'Helped with various tasks across the platform team.',
        )
        issue_types = [issue['type'] for issue in finding['issues']]
        self.assertIn('weak_verb', issue_types)
        self.assertIn('no_metric', issue_types)
        self.assertIn('vague_language', issue_types)
        self.assertEqual(finding['severity'], 'warning')

    def test_info_only_issues_keep_info_severity(self):
        experiences = [
            {
                'id': 'exp-3',
                'achievements': ['Started 3 pilots'],
            }
        ]

        result = self.orc.check_persuasion(experiences)

        self.assertEqual(result['summary']['total_bullets'], 1)
        self.assertEqual(result['summary']['flagged'], 1)
        finding = result['findings'][0]
        self.assertEqual(finding['severity'], 'info')
        self.assertEqual(
            [issue['type'] for issue in finding['issues']],
            ['no_strong_verb', 'too_short'],
        )


if __name__ == '__main__':
    unittest.main()
