"""
Tests for cv-template.html rendering behaviour.

Covers:
  - Selected Achievements section omitted when achievements list is empty
  - Selected Achievements section rendered when achievements are present
  - All experiences appear in page-two (no hard [:4] cap)
  - Page-three right column contains no duplicate experience entries
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


class TestExperiencePageFlow(unittest.TestCase):
    """Experience entries must flow into page-two without a hard count cap.

    Previously the template had a fixed [:4] / [4:] split which caused
    overflow when the first four entries were too long.  The fix renders
    all entries in page-two and removes the experience continuation from
    page-three so that CSS/WeasyPrint pagination handles page breaks.
    """

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

    def test_all_experiences_appear_in_page_two(self):
        """All experience entries (>4) must appear in the page-two section."""
        exps = self._make_experiences(6)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two', 'page-three')
        for exp in exps:
            self.assertIn(
                exp['title'], page_two,
                f"{exp['title']} missing from page-two",
            )

    def test_page_three_has_no_experience_entries(self):
        """Page-three must not duplicate experience entries from page-two."""
        exps = self._make_experiences(6)
        html = _render(experiences=exps)
        # Slice only the page-three div, stopping at the next landmark
        # (page-publications or the hidden plaintext ATS section) so that
        # job titles in the plaintext block don't produce false failures.
        page_three = (
            _page_slice(html, 'page-three', 'page-publications')
            or _page_slice(html, 'page-three', 'plaintext')
            or _page_slice(html, 'page-three', 'END PAGE THREE')
        )
        self.assertTrue(
            page_three, 'Could not locate page-three in rendered HTML'
        )
        # With the old split code, jobs 4+ appeared in page-three.
        # After the fix, none should appear there.
        for exp in exps:
            self.assertNotIn(
                exp['title'], page_three,
                f"{exp['title']} must not appear in page-three",
            )

    def test_fewer_than_four_experiences_still_render(self):
        """Fewer than 4 experiences must still render correctly in page-two."""
        exps = self._make_experiences(2)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two', 'page-three')
        for exp in exps:
            self.assertIn(exp['title'], page_two)

    def test_exactly_four_experiences_render(self):
        """Exactly 4 experiences (the old cap) must all appear in page-two."""
        exps = self._make_experiences(4)
        html = _render(experiences=exps)
        page_two = _page_slice(html, 'page-two', 'page-three')
        for exp in exps:
            self.assertIn(exp['title'], page_two)


if __name__ == '__main__':
    unittest.main()
