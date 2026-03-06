"""
Unit tests for scripts/utils/template_renderer.py

Covers:
  - format_date
  - format_phone
  - escape_latex
  - _format_location
  - _group_skills
  - create_cv_context
  - load_template / render_template (integration)
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.template_renderer import (
    format_date,
    format_phone,
    escape_latex,
    create_cv_context,
    _format_location,
    _group_skills,
    load_template,
    render_template,
)


# ---------------------------------------------------------------------------
# format_date
# ---------------------------------------------------------------------------

class TestFormatDate(unittest.TestCase):

    def test_present_string_returns_present(self):
        self.assertEqual(format_date('Present'), 'Present')

    def test_present_lowercase(self):
        self.assertEqual(format_date('present'), 'Present')

    def test_empty_string_returns_present(self):
        self.assertEqual(format_date(''), 'Present')

    def test_yyyy_mm_short_format(self):
        self.assertEqual(format_date('2020-03'), 'Mar 2020')

    def test_yyyy_mm_long_format(self):
        self.assertEqual(format_date('2020-03', format='long'), 'March 2020')

    def test_all_months_short(self):
        expected = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        for i, exp in enumerate(expected, start=1):
            self.assertEqual(format_date(f'2021-{i:02d}'), f'{exp} 2021')

    def test_all_months_long(self):
        expected = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
        for i, exp in enumerate(expected, start=1):
            self.assertEqual(format_date(f'2021-{i:02d}', format='long'), f'{exp} 2021')

    def test_year_only_returns_passthrough(self):
        # "2020" has no hyphen → returned as-is
        self.assertEqual(format_date('2020'), '2020')

    def test_garbage_returns_passthrough(self):
        self.assertEqual(format_date('not-a-month'), 'not-a-month')


# ---------------------------------------------------------------------------
# format_phone
# ---------------------------------------------------------------------------

class TestFormatPhone(unittest.TestCase):

    def test_10_digit_formatted(self):
        self.assertEqual(format_phone('5555551234'), '(555) 555-1234')

    def test_10_digit_with_punctuation(self):
        self.assertEqual(format_phone('(555) 555-1234'), '(555) 555-1234')

    def test_10_digit_with_dashes(self):
        self.assertEqual(format_phone('555-555-1234'), '(555) 555-1234')

    def test_11_digit_with_leading_1(self):
        self.assertEqual(format_phone('15555551234'), '+1 (555) 555-1234')

    def test_11_digit_with_leading_1_dashes(self):
        self.assertEqual(format_phone('1-555-555-1234'), '+1 (555) 555-1234')

    def test_international_unknown_passthrough(self):
        # 12 digits not matching 10 or 11-with-1 → return original
        result = format_phone('+44 20 7946 0958')
        self.assertEqual(result, '+44 20 7946 0958')

    def test_empty_string_passthrough(self):
        self.assertEqual(format_phone(''), '')


# ---------------------------------------------------------------------------
# escape_latex
# ---------------------------------------------------------------------------

class TestEscapeLatex(unittest.TestCase):

    def test_ampersand(self):
        self.assertEqual(escape_latex('a & b'), r'a \& b')

    def test_percent(self):
        self.assertEqual(escape_latex('50%'), r'50\%')

    def test_dollar(self):
        self.assertEqual(escape_latex('$100'), r'\$100')

    def test_hash(self):
        self.assertEqual(escape_latex('#1'), r'\#1')

    def test_underscore(self):
        self.assertEqual(escape_latex('my_var'), r'my\_var')

    def test_curly_braces(self):
        self.assertEqual(escape_latex('{a}'), r'\{a\}')

    def test_tilde(self):
        self.assertIn(r'\textasciitilde', escape_latex('hello~world'))

    def test_caret(self):
        self.assertIn(r'\^', escape_latex('x^2'))

    def test_plain_text_unchanged(self):
        self.assertEqual(escape_latex('Hello World'), 'Hello World')

    def test_empty_string(self):
        self.assertEqual(escape_latex(''), '')

    def test_multiple_specials_in_one_string(self):
        result = escape_latex('100% & $50')
        self.assertIn(r'\%', result)
        self.assertIn(r'\&', result)
        self.assertIn(r'\$', result)


# ---------------------------------------------------------------------------
# _format_location
# ---------------------------------------------------------------------------

class TestFormatLocation(unittest.TestCase):

    def test_city_and_state(self):
        self.assertEqual(_format_location({'city': 'Rochester', 'state': 'NY'}),
                         'Rochester, NY')

    def test_city_only(self):
        self.assertEqual(_format_location({'city': 'Rochester'}), 'Rochester')

    def test_state_only(self):
        self.assertEqual(_format_location({'state': 'NY'}), 'NY')

    def test_empty_dict_returns_empty(self):
        self.assertEqual(_format_location({}), '')

    def test_extra_keys_ignored(self):
        self.assertEqual(_format_location({'city': 'NYC', 'zip': '10001'}), 'NYC')


# ---------------------------------------------------------------------------
# _group_skills
# ---------------------------------------------------------------------------

class TestGroupSkills(unittest.TestCase):

    def _skills(self):
        return [
            {'name': 'Python',     'category': 'Programming'},
            {'name': 'R',          'category': 'Programming'},
            {'name': 'TensorFlow', 'category': 'ML Frameworks'},
            {'name': 'Git'},  # no category key
        ]

    def test_returns_dict(self):
        self.assertIsInstance(_group_skills(self._skills()), dict)

    def test_categories_present(self):
        grouped = _group_skills(self._skills())
        self.assertIn('Programming',   grouped)
        self.assertIn('ML Frameworks', grouped)

    def test_missing_category_falls_to_other(self):
        grouped = _group_skills(self._skills())
        self.assertIn('Other', grouped)
        names = [s['name'] for s in grouped['Other']]
        self.assertIn('Git', names)

    def test_same_category_grouped_together(self):
        grouped = _group_skills(self._skills())
        self.assertEqual(len(grouped['Programming']), 2)

    def test_empty_list_returns_empty_dict(self):
        self.assertEqual(_group_skills([]), {})


# ---------------------------------------------------------------------------
# create_cv_context
# ---------------------------------------------------------------------------

class TestCreateCvContext(unittest.TestCase):

    def _master(self):
        return {
            'personal_info': {
                'name': 'Jane Doe',
                'title': 'Scientist',
                'contact': {
                    'email': 'jane@example.com',
                    'phone': '5555551234',
                    'linkedin': 'linkedin.com/in/janedoe',
                },
                'address': {'city': 'Boston', 'state': 'MA'}
            },
            'education': [{'degree': 'PhD', 'institution': 'MIT'}],
            'awards': [{'name': 'Best Paper Award'}],
        }

    def test_required_keys_present(self):
        ctx = create_cv_context(
            self._master(), [], [], [], [], {}, job_title='Research Scientist'
        )
        for key in ('name', 'email', 'location', 'summary', 'experiences',
                    'skills', 'achievements', 'education', 'publications', 'awards'):
            self.assertIn(key, ctx, f"Missing key: {key}")

    def test_name_populated(self):
        ctx = create_cv_context(self._master(), [], [], [], [], {})
        self.assertEqual(ctx['name'], 'Jane Doe')

    def test_location_formatted(self):
        ctx = create_cv_context(self._master(), [], [], [], [], {})
        self.assertEqual(ctx['location'], 'Boston, MA')

    def test_phone_passed_through_raw(self):
        # create_cv_context passes the phone value through as-is;
        # callers can apply format_phone separately if needed.
        ctx = create_cv_context(self._master(), [], [], [], [], {})
        self.assertEqual(ctx['phone'], '5555551234')

    def test_job_title_overrides_personal_title(self):
        ctx = create_cv_context(self._master(), [], [], [], [], {}, job_title='Director')
        self.assertEqual(ctx['title'], 'Director')

    def test_skills_are_grouped_dict(self):
        skills = [
            {'name': 'Python',     'category': 'Programming'},
            {'name': 'TensorFlow', 'category': 'ML'},
        ]
        ctx = create_cv_context(self._master(), [], skills, [], [], {})
        self.assertIsInstance(ctx['skills'], dict)

    def test_education_passed_through(self):
        ctx = create_cv_context(self._master(), [], [], [], [], {})
        self.assertEqual(ctx['education'], [{'degree': 'PhD', 'institution': 'MIT'}])

    def test_summary_from_summary_dict(self):
        ctx = create_cv_context(
            self._master(), [], [], [], [],
            {'summary': 'Expert bioinformatician.'}
        )
        self.assertEqual(ctx['summary'], 'Expert bioinformatician.')


# ---------------------------------------------------------------------------
# load_template / render_template (lightweight integration)
# ---------------------------------------------------------------------------

class TestLoadAndRenderTemplate(unittest.TestCase):
    """Smoke-tests using the real cv-template.html shipped with the project."""

    _TEMPLATE_PATH = (
        Path(__file__).parent.parent / 'templates' / 'cv-template.html'
    )

    @classmethod
    def setUpClass(cls):
        cls.template_exists = cls._TEMPLATE_PATH.exists()

    def setUp(self):
        if not self.template_exists:
            self.skipTest('cv-template.html not found — skipping integration test')

    def _minimal_context(self):
        return {
            'personal_info': {
                'name': 'Test User',
                'title': 'Test Engineer',
                'contact': {
                    'email':          'test@example.com',
                    'phone':          '5555550000',
                    'linkedin':       'https://linkedin.com/in/testuser',
                    'github':         '',
                    'address_display': 'Testville, TS',
                },
                'languages': [],
            },
            'professional_summary': 'A professional.',
            'experiences': [
                {
                    'title':        'Engineer',
                    'company':      'Test Corp',
                    'start_date':   '2020-01',
                    'end_date':     'Present',
                    'achievements': ['Built things'],
                    'location':     {'city': 'Testville', 'state': 'TS'},
                }
            ],
            'education': [
                {'degree': 'BS', 'field': 'CS', 'institution': 'State U', 'end_year': '2015'}
            ],
            'skills_by_category': [
                {'category': 'Programming', 'skills': [{'name': 'Python'}, {'name': 'R'}]}
            ],
            'awards':        [{'title': 'Best Award', 'year': '2022'}],
            'certifications': [],
            'publications':   [],
            'achievements':   ['Won prize'],
            'template_metadata': {
                'variant':        'standard',
                'generated_date': '2025-01-01',
                'job_title':      'Test Engineer',
                'company':        'Test Corp',
            },
            # Normally built by CVOrchestrator._build_json_ld before rendering
            'json_ld_str': (
                '{\n'
                '  "@context": "https://schema.org",\n'
                '  "@type": "Person",\n'
                '  "name": "Test User",\n'
                '  "jobTitle": "Test Engineer"\n'
                '}'
            ),
        }

    def test_template_loads_without_error(self):
        template = load_template(str(self._TEMPLATE_PATH))
        self.assertIsNotNone(template)

    def test_render_returns_html_string(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIsInstance(html, str)
        self.assertGreater(len(html), 0)

    def test_rendered_html_contains_name(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('Test User', html)

    def test_rendered_html_starts_with_doctype_or_html(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context()).lstrip()
        self.assertTrue(
            html.lower().startswith('<!doctype') or html.lower().startswith('<html'),
            "Expected HTML output to start with <!DOCTYPE or <html"
        )

    # ── ATS metadata checks ──────────────────────────────────────────────

    def test_json_ld_script_tag_present(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('<script type="application/ld+json">', html)

    def test_json_ld_contains_schema_org_context(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('"https://schema.org"', html)

    def test_json_ld_person_type_present(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('"Person"', html)

    def test_hidden_plaintext_section_present(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('id="plaintext"', html)

    def test_plaintext_section_contains_work_experience_heading(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('WORK EXPERIENCE', html)

    def test_plaintext_section_contains_technical_skills_heading(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('TECHNICAL SKILLS', html)

    def test_plaintext_section_contains_contact_email(self):
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        self.assertIn('test@example.com', html)

    def test_plaintext_section_not_visible(self):
        """The plaintext section must be hidden from visual/print rendering."""
        template = load_template(str(self._TEMPLATE_PATH))
        html = render_template(template, self._minimal_context())
        # Check for the inline style that hides the section
        self.assertIn('display:none', html.replace(' ', ''))


if __name__ == '__main__':
    unittest.main()
