# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Tests for cv-template.html rendering behaviour.

Covers:
    - Selected Achievements section omitted when achievements list is empty
    - Selected Achievements section rendered when achievements are present
    - Print layout keeps a bounded first page and flowing continuation page
    - Technical Skills render in the continuation-page sidebar
"""

import sys
import unittest
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from jinja2 import Environment, FileSystemLoader, Undefined  # noqa: E402

_TEMPLATES_DIR = Path(__file__).parent.parent / 'templates'


def _make_env() -> Environment:
    """Return a Jinja2 environment that ignores undefined variables."""
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        undefined=Undefined,
    )


def _minimal_context(**overrides) -> dict:
    """Return the minimum context required to render cv-template.html."""
    ctx = {
        'personal_info': {
            'name': 'Test User',
            'contact': {
                'email': 'test@example.com',
                'phone': '555-0100',
                'linkedin': 'https://linkedin.com/in/test',
                'website': 'https://example.com',
            },
            'languages': [],
        },
        'professional_summary': 'Experienced professional.',
        'experiences': [],
        'achievements': [],
        'education': [],
        'skills_by_category': [],
        'awards': [],
        'certifications': [],
        'publications': [],
        'template_metadata': {
            'job_title': 'Software Engineer',
            'company': 'Acme Corp',
            'total_publications_count': 0,
            'variant': 'standard',
            'generated_date': '2026-01-01T00:00:00',
        },
        'base_font_size': '13px',
        'page_margin': '0.5in',
    }
    ctx.update(overrides)
    return ctx


def _render(**overrides) -> str:
    env = _make_env()
    template = env.get_template('cv-template.html')
    return template.render(**_minimal_context(**overrides))


def _page_slice(
    html: str,
    page_id: str,
    next_page_id: Optional[str] = None,
) -> str:
    """Extract HTML between two page markers.

    Returns '' if page_id is not found, or if next_page_id is given but
    also not found (so the caller's ``or`` chain can try the next marker).
    """
    start = html.find(f'id="{page_id}"')
    if start == -1:
        return ''
    if next_page_id:
        end = html.find(f'id="{next_page_id}"', start)
        if end == -1:
            return ''
        return html[start:end]
    return html[start:]


class TestAchievementsSection(unittest.TestCase):
    """Selected Achievements section should be conditionally rendered."""

    def test_section_absent_when_achievements_empty(self):
        """Achievements heading must not appear when the list is empty."""
        html = _render(achievements=[])
        self.assertNotIn('Selected Achievements', html)

    def test_section_present_when_achievements_populated(self):
        """Achievements heading must appear when the list has items."""
        html = _render(
            achievements=[{'text': 'Led cross-functional team to 2× revenue'}]
        )
        self.assertIn('Selected Achievements', html)

    def test_achievement_text_rendered(self):
        """Each achievement's text must appear in the rendered HTML."""
        items = [
            {'text': 'Built distributed system handling 1M req/s'},
            {'text': 'Reduced deploy time by 60%'},
        ]
        html = _render(achievements=items)
        for item in items:
            self.assertIn(item['text'], html)

    def test_section_absent_with_none_achievements(self):
        """Rendering with achievements=None must not raise and omit section."""
        # Jinja2 treats None as falsy for {% if %}, so section is skipped.
        html = _render(achievements=None)
        self.assertNotIn('Selected Achievements', html)

    def test_raw_achievement_mappings_fall_back_to_description_text(self):
        """Raw achievement mappings should still render readable text."""
        html = _render(
            achievements=[
                {
                    'title': 'Selected publication impact',
                    'description': 'Created widely used R packages.',
                }
            ]
        )
        self.assertIn('Created widely used R packages.', html)


class TestOptionalSidebarFields(unittest.TestCase):
    """Optional sidebar fields should not render empty placeholders."""

    def test_linkedin_and_website_are_omitted_when_blank(self):
        html = _render(
            personal_info={
                'name': 'Test User',
                'contact': {
                    'email': 'test@example.com',
                    'phone': '555-0100',
                    'linkedin': '   ',
                    'website': '',
                },
                'languages': [],
            }
        )
        self.assertNotIn('fab fa-linkedin', html)
        self.assertNotIn('fas fa-globe', html)

    def test_languages_section_omitted_when_empty(self):
        html = _render(
            personal_info={
                'name': 'Test User',
                'contact': {
                    'email': 'test@example.com',
                    'phone': '555-0100',
                    'linkedin': 'https://linkedin.com/in/test',
                    'website': 'https://example.com',
                },
                'languages': [],
            }
        )
        self.assertNotIn('<div class="sidebar-title">Languages</div>', html)

    def test_print_layout_uses_two_page_wrappers(self):
        html = _render(skills_by_category=[])
        self.assertNotIn('id="page-three"', html)
        self.assertIn('id="page-one"', html)
        self.assertIn('id="page-two"', html)

    def test_page_margin_default_is_rendered_in_print_rule(self):
        html = _render()
        self.assertIn('margin: var(--page-margin);', html)
        self.assertIn('--page-margin: 0.5in;', html)

    def test_print_sidebar_background_is_painted_on_page_columns(self):
        html = _render()
        self.assertIn('@page {', html)
        self.assertIn('background-color: var(--sidebar-bg) !important;', html)
        self.assertIn(
            'min-height: calc(11in - (2 * var(--page-margin)));',
            html,
        )
        self.assertIn('box-decoration-break: clone;', html)
        self.assertIn('background: white !important;', html)
        self.assertIn('#page-two {', html)
        self.assertIn('page-break-before: always;', html)

    def test_base_font_size_default_is_rendered(self):
        html = _render()
        self.assertIn('font-size: 13px;', html)

    def test_first_page_keeps_page_number_rule(self):
        html = _render()
        self.assertNotIn('@page :first', html)


class TestExperiencePageFlow(unittest.TestCase):
    """Experience and skills should render in the continuation page."""

    def _make_experiences(self, count: int) -> list:
        return [
            {
                'title': f'Job {i}',
                'company': f'Company {i}',
                'start_date': '2020-01',
                'end_date': '2022-01',
                'ordered_achievements': [],
                'achievements': [],
            }
            for i in range(count)
        ]

    def test_all_experiences_render_in_continuation_page(self):
        exps = self._make_experiences(6)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two')
        for exp in exps:
            self.assertIn(exp['title'], page_two)

    def test_experience_heading_is_not_rendered_on_first_page(self):
        html = _render(
            achievements=[{'text': 'Built a major platform'}],
            experiences=self._make_experiences(1),
        )
        page_one = _page_slice(html, 'page-one', 'page-two')
        page_two = _page_slice(html, 'page-two')
        achievements_heading = (
            '<h2 class="section-title"><i class="fas fa-trophy"></i> '
            'Selected Achievements</h2>'
        )
        experience_heading = (
            '<h2 class="section-title"><i class="fas fa-briefcase"></i> '
            'Experience</h2>'
        )
        self.assertIn(achievements_heading, page_one)
        self.assertNotIn(experience_heading, page_one)
        self.assertIn(experience_heading, page_two)

    def test_skills_render_in_continuation_sidebar(self):
        html = _render(
            skills_by_category=[
                {
                    'category': 'Programming',
                    'skills': [{'name': 'Python', 'aliases': []}],
                }
            ]
        )
        page_two = _page_slice(html, 'page-two')
        self.assertIn('Technical Skills', page_two)
        self.assertIn('Programming', page_two)
        self.assertIn('Python', page_two)

    def test_all_skill_groups_render_in_continuation_sidebar(self):
        html = _render(
            skills_by_category=[
                {'category': 'Programming', 'skills': [{'name': 'Python'}]},
                {'category': 'Cloud', 'skills': [{'name': 'AWS'}]},
                {'category': 'ML', 'skills': [{'name': 'PyTorch'}]},
                {'category': 'Data', 'skills': [{'name': 'SQL'}]},
                {'category': 'Ops', 'skills': [{'name': 'Docker'}]},
                {'category': 'Leadership', 'skills': [{'name': 'Mentoring'}]},
            ]
        )
        page_two = _page_slice(html, 'page-two')
        for label in ('Programming', 'Cloud', 'ML', 'Data', 'Ops', 'Leadership'):
            self.assertIn(label, page_two)

    def test_fewer_than_four_experiences_still_render(self):
        """Multiple experiences should still render in the continuation page."""
        exps = self._make_experiences(2)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two')
        for exp in exps:
            self.assertIn(exp['title'], page_two)

    def test_exactly_four_experiences_render(self):
        """Exactly 4 experiences should all render in the continuation page."""
        exps = self._make_experiences(4)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two')
        for exp in exps:
            self.assertIn(exp['title'], page_two)


if __name__ == '__main__':
    unittest.main()
