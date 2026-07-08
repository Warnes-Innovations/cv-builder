# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for PATCH /api/sessions/active/notes (GAP-386).

Active (in-progress, not-yet-saved) sessions previously had no way to record
a note at all — the existing PATCH /api/sessions/metadata endpoint addresses
sessions by file path, which an active session does not have until it is
saved. This endpoint addresses the current session by session_id instead,
writing to its session_dir/metadata.json sidecar.
"""
import argparse
import json
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app


def _make_args(**overrides) -> argparse.Namespace:
    defaults = dict(
        llm_provider = 'local',
        model        = None,
        master_data  = None,
        publications = None,
        output_dir   = '/tmp/cv_test_output',
        job_file     = None,
    )
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


def _make_app(session_dir=None):
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    mock_conversation = MagicMock()
    mock_conversation.state = {'phase': 'job_analysis'}
    mock_conversation.session_dir = session_dir

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))

    app = create_app(_make_args())
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_conversation, sid, stack


class TestSessionActiveNotesPatch(unittest.TestCase):

    def test_writes_notes_to_session_dir_metadata(self):
        with tempfile.TemporaryDirectory() as td:
            app, conv, sid, stack = _make_app(session_dir=td)
            with stack, app.test_client() as client:
                res  = client.patch('/api/sessions/active/notes',
                                    json={'session_id': sid, 'notes': 'Phone screen 3/10'})
                data = res.get_json()

            self.assertEqual(res.status_code, 200)
            self.assertTrue(data['ok'])
            self.assertEqual(data['notes'], 'Phone screen 3/10')

            meta = json.loads((Path(td) / 'metadata.json').read_text())
            self.assertEqual(meta['notes'], 'Phone screen 3/10')

    def test_merges_with_existing_metadata_rather_than_overwriting(self):
        with tempfile.TemporaryDirectory() as td:
            (Path(td) / 'metadata.json').write_text(
                json.dumps({'application_status': 'sent'})
            )
            app, conv, sid, stack = _make_app(session_dir=td)
            with stack, app.test_client() as client:
                client.patch('/api/sessions/active/notes',
                             json={'session_id': sid, 'notes': 'Following up'})

            meta = json.loads((Path(td) / 'metadata.json').read_text())
            self.assertEqual(meta['application_status'], 'sent')
            self.assertEqual(meta['notes'], 'Following up')

    def test_returns_400_when_notes_field_missing(self):
        with tempfile.TemporaryDirectory() as td:
            app, conv, sid, stack = _make_app(session_dir=td)
            with stack, app.test_client() as client:
                res = client.patch('/api/sessions/active/notes', json={'session_id': sid})
            self.assertEqual(res.status_code, 400)

    def test_returns_400_when_session_has_no_session_dir_yet(self):
        app, conv, sid, stack = _make_app(session_dir=None)
        with stack, app.test_client() as client:
            res = client.patch('/api/sessions/active/notes',
                               json={'session_id': sid, 'notes': 'x'})
        self.assertEqual(res.status_code, 400)

    def test_returns_400_when_session_id_missing(self):
        app, conv, sid, stack = _make_app(session_dir='/tmp/whatever')
        with stack, app.test_client() as client:
            res = client.patch('/api/sessions/active/notes', json={'notes': 'x'})
        self.assertEqual(res.status_code, 400)


if __name__ == '__main__':
    unittest.main()
