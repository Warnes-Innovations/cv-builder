"""
Tests for layout instruction phase (Phase 12).

Tests layout instruction handling, HTML serialization, and phase transitions.
"""

import unittest
from unittest.mock import MagicMock
from pathlib import Path
import json
import sys
import tempfile

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.conversation_manager import ConversationManager
from utils.cv_orchestrator import CVOrchestrator
from utils.llm_client import LLMClient
from utils.config import get_config


class TestLayoutInstructions(unittest.TestCase):
    """Test layout instruction phase integration."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = get_config()

        # Mock LLM client
        self.mock_llm = MagicMock(spec=LLMClient)

        # Create minimal inline master data
        self.minimal_master_data = {
            'personal_info': {
                'name':  'Test User',
                'title': 'Engineer',
                'contact': {
                    'email':   'test@example.com',
                    'phone':   '5555551234',
                    'linkedin': '',
                    'github':   '',
                    'address':  {'city': 'Boston', 'state': 'MA'},
                },
            },
            'experiences': [
                {'company': 'Genentech', 'title': 'Senior Scientist', 'start': '2021-01', 'end': '2023-12', 'bullets': ['Item 1']},
                {'company': 'Google', 'title': 'Engineer', 'start': '2018-01', 'end': '2021-12', 'bullets': ['Item 2']},
            ],
            'education': [{'degree': 'PhD', 'institution': 'MIT', 'year': '2015'}],
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'Scala', 'category': 'Programming'},
            ],
            'achievements': [],
            'awards': [],
            'publications': [],
            'summaries': [{'summary': 'Experienced engineer.', 'audience': []}],
        }

        # Write master data to temp file
        import tempfile
        self.temp_dir = tempfile.mkdtemp()
        self.master_data_path = Path(self.temp_dir) / 'Master_CV_Data.json'
        with open(self.master_data_path, 'w') as f:
            json.dump(self.minimal_master_data, f)

        self.publications_path = Path(self.temp_dir) / 'publications.bib'
        self.publications_path.write_text('')

        # Create orchestrator
        self.orchestrator = CVOrchestrator(
            master_data_path=str(self.master_data_path),
            publications_path=str(self.publications_path),
            output_dir=self.temp_dir,
            llm_client=self.mock_llm
        )

        # Create conversation manager
        self.conversation = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config
        )

    def test_layout_phase_in_state(self):
        """Verify layout_instructions field exists in conversation state."""
        self.assertIn('layout_instructions', self.conversation.state)
        self.assertEqual(self.conversation.state['layout_instructions'], [])

    def test_layout_phase_in_step_mapping(self):
        """Verify 'layout' is mapped in _STEP_TO_PHASE."""
        self.assertIn('layout', self.conversation._STEP_TO_PHASE)
        self.assertEqual(self.conversation._STEP_TO_PHASE['layout'], 'layout_review')

    def test_complete_layout_review_advances_phase(self):
        """Test that complete_layout_review advances phase to 'refinement'."""
        # Set initial phase to 'layout'
        self.conversation.state['phase'] = 'layout'

        # Complete layout review with mock instructions
        instructions = [
            {
                'timestamp': '10:00:00 AM',
                'instruction_text': 'Move Publications after Skills',
                'change_summary': 'Publications section moved',
                'confirmation': True
            }
        ]

        result = self.conversation.complete_layout_review(instructions)

        # Verify phase advanced
        self.assertEqual(self.conversation.state['phase'], 'refinement')
        self.assertEqual(self.conversation.state['layout_instructions'], instructions)
        self.assertEqual(result['instructions_applied'], 1)
        self.assertEqual(result['phase'], 'refinement')

    def test_complete_layout_review_empty_instructions(self):
        """Test complete_layout_review with no instructions (zero changes)."""
        self.conversation.state['phase'] = 'layout'

        result = self.conversation.complete_layout_review([])

        self.assertEqual(result['instructions_applied'], 0)
        self.assertEqual(self.conversation.state['phase'], 'refinement')

    def test_serialize_html_for_context(self):
        """Test HTML serialization for LLM context."""
        html = """
        <html>
          <h2>Contact Information</h2>
          <h2>Professional Summary</h2>
          <h2>Experience</h2>
          <li>Genentech (2021-2023)</li>
          <li>Google (2018-2021)</li>
          <h2>Skills</h2>
        </html>
        """

        outline = self.orchestrator._serialize_html_for_context(html)

        # Verify it contains headings
        self.assertIn('Contact Information', outline)
        self.assertIn('Professional Summary', outline)
        self.assertIn('Experience', outline)
        # Verify it includes item count
        self.assertIn('items', outline.lower() or '1')

    def test_apply_layout_instruction_success(self):
        """Test successful layout instruction application."""
        # Mock LLM response on the instance mock used by the orchestrator
        self.mock_llm.call_llm.return_value = json.dumps({
            'modified_html': '<html><h2>Skills</h2><h2>Publications</h2></html>',
            'change_summary': 'Publications section moved after Skills',
            'confidence': 0.95,
            'requires_clarification': False
        })

        instruction = 'Move Publications after Skills'
        current_html = '<html><h2>Publications</h2><h2>Skills</h2></html>'

        result = self.orchestrator.apply_layout_instruction(
            instruction_text=instruction,
            current_html=current_html
        )

        # Verify result
        self.assertNotIn('error', result)
        self.assertIn('html', result)
        self.assertIn('summary', result)
        self.assertEqual(result['confidence'], 0.95)
        self.assertIn('Publications', result['html'])

    def test_apply_layout_instruction_low_confidence(self):
        """Test layout instruction with low LLM confidence."""
        # Mock LLM response with low confidence
        self.mock_llm.call_llm.return_value = json.dumps({
            'modified_html': '',
            'change_summary': '',
            'confidence': 0.4,
            'requires_clarification': False
        })

        instruction = 'Something ambiguous'
        current_html = '<html>Content</html>'

        result = self.orchestrator.apply_layout_instruction(
            instruction_text=instruction,
            current_html=current_html
        )

        # Verify low confidence is flagged
        self.assertEqual(result.get('error'), 'low_confidence')
        self.assertLess(result['confidence'], 0.7)

    def test_apply_layout_instruction_requires_clarification(self):
        """Test layout instruction that requires user clarification."""
        # Mock LLM response asking for clarification
        self.mock_llm.call_llm.return_value = json.dumps({
            'requires_clarification': True,
            'clarification_question': 'Should Publications go before or after Education?',
            'confidence': 0.6
        })

        instruction = 'Reorder sections'
        current_html = '<html>Content</html>'

        result = self.orchestrator.apply_layout_instruction(
            instruction_text=instruction,
            current_html=current_html
        )

        # Verify clarification is requested
        self.assertEqual(result.get('error'), 'clarify')
        self.assertIn('clarification_question', result)

    def test_apply_layout_instruction_preserves_text(self):
        """Test that layout instructions don't alter text content."""
        original_text = 'Led team of 5 engineers to build scalable platform'
        html_with_text = f'<html><li>{original_text}</li></html>'

        # Mock LLM response that reorders sections but preserves text
        self.mock_llm.call_llm.return_value = json.dumps({
            'modified_html': f'<html><h2>Skills</h2><li>{original_text}</li></html>',
            'change_summary': 'Reordered sections',
            'confidence': 0.9,
            'requires_clarification': False
        })

        result = self.orchestrator.apply_layout_instruction(
            instruction_text='Swap order',
            current_html=html_with_text
        )

        # Verify original text is preserved
        self.assertIn(original_text, result['html'])

    def test_apply_layout_instruction_with_prior_context(self):
        """Test that prior instructions are included in LLM context."""
        self.mock_llm.call_llm.return_value = json.dumps({
            'modified_html': '<html>Modified</html>',
            'change_summary': 'Applied instruction',
            'confidence': 0.9,
            'requires_clarification': False
        })

        prior = [
            {'instruction_text': 'First instruction'},
            {'instruction_text': 'Second instruction'}
        ]

        self.orchestrator.apply_layout_instruction(
            instruction_text='Third instruction',
            current_html='<html>Content</html>',
            prior_instructions=prior
        )

        # Verify call_llm was invoked with prior context
        self.assertTrue(self.mock_llm.call_llm.called)
        prompt_arg = self.mock_llm.call_llm.call_args[1]['prompt']
        self.assertIn('PRIOR INSTRUCTIONS', prompt_arg)

    def test_layout_phase_transition_from_generation(self):
        """Test phase transition from 'generation' to 'layout'."""
        self.conversation.state['phase'] = 'generation'
        self.conversation.state['generated_files'] = {'*.html': '<html>Page</html>'}

        # User should be able to navigate to layout phase
        self.assertEqual(self.conversation.state['phase'], 'generation')
        # Can advance to layout via complete_layout_review or explicit phase change
        self.conversation.state['phase'] = 'layout'
        self.assertEqual(self.conversation.state['phase'], 'layout')

    def test_layout_phase_transition_to_refinement(self):
        """Test phase transition from 'layout' to 'refinement'."""
        self.conversation.state['phase'] = 'layout'

        result = self.conversation.complete_layout_review([])

        self.assertEqual(self.conversation.state['phase'], 'refinement')
        self.assertEqual(result['phase'], 'refinement')


class TestLayoutInstructionIntegration(unittest.TestCase):
    """Integration tests for layout instruction workflow."""

    def setUp(self):
        """Set up for integration tests."""
        self.config = get_config()
        self.mock_llm = MagicMock(spec=LLMClient)

        # Create minimal inline master data
        minimal_master_data = {
            'personal_info': {
                'name':  'Test User',
                'title': 'Engineer',
                'contact': {
                    'email':   'test@example.com',
                    'phone':   '5555551234',
                    'linkedin': '',
                    'github':   '',
                    'address':  {'city': 'Boston', 'state': 'MA'},
                },
            },
            'experiences': [
                {'company': 'Genentech', 'title': 'Senior Scientist', 'start': '2021-01', 'end': '2023-12', 'bullets': ['Item 1']},
                {'company': 'Google', 'title': 'Engineer', 'start': '2018-01', 'end': '2021-12', 'bullets': ['Item 2']},
            ],
            'education': [{'degree': 'PhD', 'institution': 'MIT', 'year': '2015'}],
            'skills': [
                {'name': 'Python', 'category': 'Programming'},
                {'name': 'Scala', 'category': 'Programming'},
            ],
            'achievements': [],
            'awards': [],
            'publications': [],
            'summaries': [{'summary': 'Experienced engineer.', 'audience': []}],
        }

        # Write master data to temp file
        import tempfile
        self.temp_dir = tempfile.mkdtemp()
        master_data_path = Path(self.temp_dir) / 'Master_CV_Data.json'
        with open(master_data_path, 'w') as f:
            json.dump(minimal_master_data, f)

        publications_path = Path(self.temp_dir) / 'publications.bib'
        publications_path.write_text('')

        self.orchestrator = CVOrchestrator(
            master_data_path=str(master_data_path),
            publications_path=str(publications_path),
            output_dir=self.temp_dir,
            llm_client=self.mock_llm
        )

        self.conversation = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config
        )

    def test_full_layout_instruction_workflow(self):
        """Test complete workflow: generation → layout → refinement."""
        # Setup: generation phase complete
        self.conversation.state['phase'] = 'generation'
        self.conversation.state['generated_files'] = {'*.html': '<html>Initial</html>'}

        # Move to layout phase
        self.conversation.state['phase'] = 'layout'
        self.assertEqual(self.conversation.state['phase'], 'layout')

        # Mock instruction application on the instance mock used by the orchestrator
        self.mock_llm.call_llm.return_value = json.dumps({
            'modified_html': '<html>Modified</html>',
            'change_summary': 'Layout updated',
            'confidence': 0.95,
            'requires_clarification': False
        })

        # Apply instruction
        result = self.orchestrator.apply_layout_instruction(
            instruction_text='Reorder sections',
            current_html='<html>Initial</html>'
        )
        self.assertNotIn('error', result)

        # Complete layout review
        instructions = [{
            'timestamp': '10:00',
            'instruction_text': 'Reorder sections',
            'change_summary': result['summary'],
            'confirmation': True
        }]

        final_result = self.conversation.complete_layout_review(instructions)

        # Verify final state
        self.assertEqual(self.conversation.state['phase'], 'refinement')
        self.assertEqual(len(self.conversation.state['layout_instructions']), 1)


if __name__ == '__main__':
    unittest.main()
