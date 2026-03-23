# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
# pyright: reportMissingImports=false
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for session cleanup scanning and actions."""

from __future__ import annotations

import copy
import io
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS_PATH = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS_PATH))

MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / 'scripts'
    / 'utils'
    / 'session_cleanup.py'
)
SPEC = importlib.util.spec_from_file_location('session_cleanup', MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f'Failed to load session_cleanup from {MODULE_PATH}')
session_cleanup = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = session_cleanup
SPEC.loader.exec_module(session_cleanup)
CLI_MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / 'scripts'
    / 'cleanup_sessions.py'
)
CLI_SPEC = importlib.util.spec_from_file_location(
    'cleanup_sessions_cli',
    CLI_MODULE_PATH,
)
if CLI_SPEC is None or CLI_SPEC.loader is None:
    raise RuntimeError(
        f'Failed to load cleanup_sessions from {CLI_MODULE_PATH}'
    )
cleanup_sessions_cli = importlib.util.module_from_spec(CLI_SPEC)
sys.modules[CLI_SPEC.name] = cleanup_sessions_cli
CLI_SPEC.loader.exec_module(cleanup_sessions_cli)
SessionCandidate = session_cleanup.SessionCandidate
apply_action = session_cleanup.apply_action
scan_sessions = session_cleanup.scan_sessions
format_scan_report = session_cleanup.format_scan_report
format_scan_report_with_mode = session_cleanup.format_scan_report_with_mode
format_category_report = session_cleanup.format_category_report


def _base_payload() -> dict:
    return {
        'session_id': 'abc12345',
        'timestamp': '2026-03-22T00:10:05.491011',
        'state': {
            'phase': 'customization',
            'position_name': 'Senior Data Scientist at ExampleCo',
            'job_description': 'Real job description',
            'job_analysis': {
                'title': 'Senior Data Scientist',
                'company': 'ExampleCo',
            },
            'post_analysis_questions': [],
            'post_analysis_answers': {},
            'customizations': None,
            'generated_files': None,
            'pending_rewrites': None,
            'persuasion_warnings': [],
            'generation_progress': [],
            'approved_rewrites': [],
            'rewrite_audit': [],
            'layout_instructions': [],
            'cover_letter_text': None,
            'cover_letter_params': None,
            'cover_letter_reused_from': None,
            'screening_responses': [],
            'experience_decisions': {},
            'skill_decisions': {},
            'achievement_decisions': {},
            'publication_decisions': {},
            'summary_focus_override': None,
            'extra_skills': [],
            'achievement_rewrite_log': [],
            'generation_state': {},
            'intake': {},
        },
        'conversation_history': [{'role': 'user', 'content': 'hello'}],
    }


def _write_session(root: Path, relative_dir: str, payload: dict | str) -> Path:
    session_dir = root / relative_dir
    session_dir.mkdir(parents=True, exist_ok=True)
    session_file = session_dir / 'session.json'
    if isinstance(payload, str):
        session_file.write_text(payload, encoding='utf-8')
    else:
        session_file.write_text(
            json.dumps(payload, indent=2),
            encoding='utf-8',
        )
    return session_file


class TestSessionCleanup(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_scan_groups_trashed_corrupted_empty_test_and_duplicate(self):
        live = _base_payload()
        duplicate = copy.deepcopy(live)
        duplicate['session_id'] = 'xyz98765'
        duplicate['timestamp'] = '2026-03-21T00:10:05.491011'

        empty = _base_payload()
        empty['state']['position_name'] = None
        empty['state']['job_description'] = None
        empty['state']['job_analysis'] = None
        empty['conversation_history'] = []

        test_payload = _base_payload()
        test_payload['state']['position_name'] = 'Acme Corp'
        test_payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        test_payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }

        _write_session(self.root, 'live_primary', live)
        _write_session(self.root, 'live_duplicate', duplicate)
        _write_session(self.root, 'empty_session', empty)
        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', test_payload)
        _write_session(self.root, '.trash/pending_20260318_144823', live)
        _write_session(self.root, 'corrupted_session', '{not-json]')

        result = scan_sessions(self.root)

        self.assertEqual(result.total_session_files, 6)
        self.assertEqual(len(result.categories['trashed']), 1)
        self.assertEqual(len(result.categories['corrupted']), 1)
        self.assertEqual(len(result.categories['empty']), 1)
        self.assertEqual(len(result.categories['test']), 1)
        self.assertEqual(len(result.categories['duplicate']), 1)
        self.assertEqual(
            result.categories['duplicate'][0].relative_path,
            'live_duplicate/session.json',
        )
        self.assertEqual(
            result.categories['duplicate'][0].duplicate_of,
            'live_primary/session.json',
        )

    def test_duplicate_detection_ignores_timestamp_and_session_id(self):
        first = _base_payload()
        second = copy.deepcopy(first)
        second['session_id'] = 'second'
        second['timestamp'] = '2026-03-23T00:00:00'

        _write_session(self.root, 'older', first)
        _write_session(self.root, 'newer', second)

        result = scan_sessions(self.root)

        self.assertEqual(len(result.categories['duplicate']), 1)
        self.assertEqual(
            result.categories['duplicate'][0].relative_path,
            'older/session.json',
        )
        self.assertEqual(
            result.categories['duplicate'][0].duplicate_of,
            'newer/session.json',
        )

    def test_compact_report_uses_table_by_default(self):
        payload = _base_payload()
        payload['state']['position_name'] = 'Acme Corp'
        payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }
        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', payload)

        report = format_scan_report(scan_sessions(self.root))

        self.assertIn('[duplicate] 0 candidate(s)', report)
        self.assertIn('[trashed] 0 candidate(s)', report)
        self.assertIn('[test] 1 candidate(s)', report)
        self.assertIn('file', report)
        self.assertIn(' | title', report)
        self.assertIn('AcmeCorp_Role_2026-03-22/session.json', report)
        self.assertNotIn('reason:', report)

    def test_detailed_report_preserves_verbose_reason_lines(self):
        payload = _base_payload()
        payload['state']['position_name'] = 'Acme Corp'
        payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }
        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', payload)

        report = format_scan_report_with_mode(
            scan_sessions(self.root),
            detailed=True,
        )

        self.assertIn('  - AcmeCorp_Role_2026-03-22/session.json', report)
        self.assertIn(
            '    reason: Directory name matches the '
            'AcmeCorp test-session pattern.',
            report,
        )
        self.assertNotIn(
            'file                                 | title',
            report,
        )

    def test_format_category_report_supports_compact_and_detailed_modes(self):
        payload = _base_payload()
        payload['state']['position_name'] = 'Acme Corp'
        payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }
        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', payload)
        result = scan_sessions(self.root)

        compact = format_category_report(
            'test',
            result.categories['test'],
            detailed=False,
        )
        detailed = format_category_report(
            'test',
            result.categories['test'],
            detailed=True,
        )

        self.assertIn(' | title', compact)
        self.assertNotIn('reason:', compact)
        self.assertIn('reason: Directory name matches', detailed)

    def test_main_interactive_shows_each_category_before_prompting(self):
        test_payload = _base_payload()
        test_payload['state']['position_name'] = 'Acme Corp'
        test_payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        test_payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }

        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', test_payload)
        _write_session(
            self.root,
            '.trash/pending_20260318_144823',
            _base_payload(),
        )

        args = cleanup_sessions_cli.parse_args(['--root', str(self.root)])
        answers = iter(['l', 'l'])
        prompts: list[str] = []

        def fake_input(prompt: str) -> str:
            prompts.append(prompt)
            print(prompt, end='')
            return next(answers)

        with patch.object(
            cleanup_sessions_cli,
            'parse_args',
            return_value=args,
        ), patch.object(
            sys.stdin,
            'isatty',
            return_value=True,
        ), patch(
            'builtins.input',
            side_effect=fake_input,
        ), patch(
            'sys.stdout',
            new_callable=io.StringIO,
        ) as stdout:
            exit_code = cleanup_sessions_cli.main()

        output = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertEqual(len(prompts), 2)
        self.assertLess(
            output.index('[test] 1 candidate(s)'),
            output.index('Action for test'),
        )
        self.assertLess(
            output.index('Action for test'),
            output.index('[trashed] 1 candidate(s)'),
        )
        self.assertNotIn('[duplicate] 0 candidate(s)', output)

    def test_prompt_action_accepts_cancel(self):
        prompt_action = getattr(cleanup_sessions_cli, '_prompt_action')
        with patch('builtins.input', side_effect=['c']):
            action = prompt_action('test', 2, detail_text=None)

        self.assertEqual(action, 'cancel')

    def test_main_interactive_cancel_stops_remaining_categories(self):
        test_payload = _base_payload()
        test_payload['state']['position_name'] = 'Acme Corp'
        test_payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        test_payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }

        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', test_payload)
        _write_session(
            self.root,
            '.trash/pending_20260318_144823',
            _base_payload(),
        )

        args = cleanup_sessions_cli.parse_args(['--root', str(self.root)])

        def fake_input(prompt: str) -> str:
            print(prompt, end='')
            return 'c'

        with patch.object(
            cleanup_sessions_cli,
            'parse_args',
            return_value=args,
        ), patch.object(
            sys.stdin,
            'isatty',
            return_value=True,
        ), patch(
            'builtins.input',
            side_effect=fake_input,
        ), patch(
            'sys.stdout',
            new_callable=io.StringIO,
        ) as stdout:
            exit_code = cleanup_sessions_cli.main()

        output = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn('Cancelled session cleanup', output)
        self.assertIn('[test] 1 candidate(s)', output)
        self.assertNotIn('[trashed] 1 candidate(s)', output)

    def test_main_interactive_delete_continues_to_later_categories(self):
        test_payload = _base_payload()
        test_payload['state']['position_name'] = 'Acme Corp'
        test_payload['state']['job_description'] = (
            'Senior Data Science Manager\nRemote - XYZ Corp\n\n'
            'We are seeking a Senior Data Science Manager '
            'to lead our data science team.'
        )
        test_payload['state']['job_analysis'] = {
            'job_title': 'Senior Data Scientist',
            'company': 'Acme Corp',
        }

        _write_session(self.root, 'AcmeCorp_Role_2026-03-22', test_payload)
        _write_session(
            self.root,
            '.trash/pending_20260318_144823',
            _base_payload(),
        )

        args = cleanup_sessions_cli.parse_args(['--root', str(self.root)])
        answers = iter(['d', 'DELETE', 'l'])

        def fake_input(prompt: str) -> str:
            print(prompt, end='')
            return next(answers)

        with patch.object(
            cleanup_sessions_cli,
            'parse_args',
            return_value=args,
        ), patch.object(
            sys.stdin,
            'isatty',
            return_value=True,
        ), patch(
            'builtins.input',
            side_effect=fake_input,
        ), patch(
            'sys.stdout',
            new_callable=io.StringIO,
        ) as stdout:
            exit_code = cleanup_sessions_cli.main()

        output = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn('[deleted]', output)
        self.assertIn('[trashed] 1 candidate(s)', output)
        self.assertIn('Action for trashed', output)
        self.assertIn('Session cleanup complete.', output)

    def test_prompt_action_can_show_details_then_reprompt(self):
        prompt_action = getattr(cleanup_sessions_cli, '_prompt_action')
        with patch(
            'builtins.input',
            side_effect=['v', 'l'],
        ), patch('sys.stdout', new_callable=io.StringIO) as stdout:
            action = prompt_action(
                'test',
                2,
                detail_text='[test] 2 candidate(s)\n  - sample/session.json',
            )

        self.assertEqual(action, 'leave')
        self.assertIn('[test] 2 candidate(s)', stdout.getvalue())
        self.assertIn('sample/session.json', stdout.getvalue())

    def test_parse_args_accepts_read_only_alias(self):
        args = cleanup_sessions_cli.parse_args(['--read-only'])

        self.assertTrue(args.report_only)
        self.assertFalse(args.detailed)

    def test_apply_action_moves_directory_to_trash(self):
        payload = _base_payload()
        live_file = _write_session(self.root, 'live', payload)

        candidate = SessionCandidate(
            category='test',
            session_file=live_file,
            session_dir=live_file.parent,
            relative_path='live/session.json',
            timestamp=payload['timestamp'],
            phase=payload['state']['phase'],
            position_name=payload['state']['position_name'],
            reasons=('manual',),
        )

        outcomes = apply_action(self.root, [candidate], 'trash')

        self.assertEqual(outcomes[0].status, 'trashed')
        self.assertFalse((self.root / 'live').exists())
        self.assertTrue(
            (self.root / '.trash' / 'live' / 'session.json').exists()
        )

    def test_apply_action_deletes_directory(self):
        payload = _base_payload()
        session_file = _write_session(self.root, '.trash/old_session', payload)

        candidate = SessionCandidate(
            category='trashed',
            session_file=session_file,
            session_dir=session_file.parent,
            relative_path='.trash/old_session/session.json',
            timestamp=payload['timestamp'],
            phase=payload['state']['phase'],
            position_name=payload['state']['position_name'],
            reasons=('already trashed',),
        )

        outcomes = apply_action(self.root, [candidate], 'delete')

        self.assertEqual(outcomes[0].status, 'deleted')
        self.assertFalse((self.root / '.trash' / 'old_session').exists())

    def test_apply_action_rejects_paths_outside_root(self):
        outside_tmp = tempfile.TemporaryDirectory()
        try:
            outside_root = Path(outside_tmp.name)
            session_file = _write_session(
                outside_root,
                'outside',
                _base_payload(),
            )

            candidate = SessionCandidate(
                category='corrupted',
                session_file=session_file,
                session_dir=session_file.parent,
                relative_path='outside/session.json',
                timestamp=None,
                phase=None,
                position_name=None,
                reasons=('outside',),
            )

            with self.assertRaises(ValueError):
                apply_action(self.root, [candidate], 'delete')
        finally:
            outside_tmp.cleanup()


if __name__ == '__main__':
    unittest.main()
