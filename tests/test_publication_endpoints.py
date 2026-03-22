# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for the publication CRUD API endpoints.

Covers:
  GET  /api/master-data/publications           (structured list + raw content)
  PUT  /api/master-data/publications           (raw BibTeX save with backup/restore)
  POST /api/master-data/publications/validate  (parse without saving)
  POST /api/master-data/publication            (add / update / delete)
  POST /api/master-data/publications/import
  POST /api/master-data/publications/convert
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


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

SAMPLE_MASTER_DATA: dict = {
    'personal_info': {
        'name': 'Jane Doe',
        'contact': {'email': 'jane@example.com'},
    },
    'experiences':  [],
    'education':    [],
    'skills':       [],
    'awards':       [],
    'publications': [],
    'summaries':    [],
}

# A small but valid BibTeX file written to the temp pubs_path fixture.
SAMPLE_BIB_TEXT = """\
@article{doe2024,
  author  = {Doe, Jane},
  title   = {Sample Article},
  journal = {Journal of Testing},
  year    = {2024},
  volume  = {1},
  pages   = {1--10},
}
"""

# BibTeX for import tests.
IMPORT_BIB_TEXT = """\
@article{smith2023,
  author  = {Smith, John},
  title   = {Another Study},
  journal = {Science Today},
  year    = {2023},
}
@article{jones2022,
  author  = {Jones, Alice},
  title   = {Third Work},
  journal = {Nature},
  year    = {2022},
}
"""


def _make_app_and_client(tmp_dir: Path, bib_content: str = SAMPLE_BIB_TEXT):
    """Create an isolated test Flask app + client.

    Returns (app, session_id, stack).  Caller must call ``stack.close()``
    to tear down patches.
    """
    master_path = tmp_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(SAMPLE_MASTER_DATA), encoding='utf-8')

    pubs_path = tmp_dir / 'publications.bib'
    pubs_path.write_text(bib_content, encoding='utf-8')

    args = argparse.Namespace(
        llm_provider   = 'local',
        model          = None,
        master_data    = str(master_path),
        publications   = str(pubs_path),
        output_dir     = str(tmp_dir / 'output'),
        job_file       = None,
    )

    mock_llm = MagicMock()
    mock_llm.model        = 'local-model'
    mock_llm.last_usage   = None
    mock_llm.chat.return_value = {
        'response':    'ok',
        'stop_reason': 'end_turn',
        'usage':       {'prompt_tokens': 10, 'completion_tokens': 5},
    }

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider',       return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.get_cached_pricing',      return_value={}))
    stack.enter_context(patch('scripts.web_app.get_pricing_updated_at',  return_value='2024-01-01'))
    stack.enter_context(patch('scripts.web_app.get_pricing_source',      return_value='static'))

    app = create_app(args)
    app.config['TESTING'] = True
    app.mock_llm  = mock_llm
    app.pubs_path = pubs_path

    with app.test_client() as tmp_client:
        session_id = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, session_id, stack


def _post(client, url, session_id: str, body: dict):
    """POST helper that injects session_id into the body."""
    return client.post(
        url,
        json={**body, 'session_id': session_id},
        content_type='application/json',
    )


def _get(client, url, session_id: str):
    """GET helper that passes session_id as a query param."""
    return client.get(url, query_string={'session_id': session_id})


def _put(client, url, session_id: str, body: dict):
    """PUT helper that injects session_id into the body."""
    return client.put(
        url,
        json={**body, 'session_id': session_id},
        content_type='application/json',
    )


# ---------------------------------------------------------------------------
# GET /api/master-data/publications
# ---------------------------------------------------------------------------

class TestGetPublications(unittest.TestCase):
    """Tests for GET /api/master-data/publications."""

    def setUp(self):
        self.tmp   = tempfile.TemporaryDirectory()
        self.path  = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_returns_200(self):
        r = _get(self.client, '/api/master-data/publications', self.sid)
        self.assertEqual(r.status_code, 200)

    def test_returns_ok_true(self):
        r = _get(self.client, '/api/master-data/publications', self.sid)
        self.assertTrue(r.get_json().get('ok'))

    def test_returns_publications_list(self):
        r = _get(self.client, '/api/master-data/publications', self.sid)
        data = r.get_json()
        self.assertIn('publications', data)
        self.assertIsInstance(data['publications'], list)

    def test_returns_existing_entry(self):
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        pubs = r.get_json()['publications']
        keys = [p['key'] for p in pubs]
        self.assertIn('doe2024', keys)

    def test_each_entry_has_required_fields(self):
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        pubs = r.get_json()['publications']
        for pub in pubs:
            for field in ('key', 'type', 'fields', 'formatted_citation'):
                self.assertIn(field, pub, f"Missing '{field}' in publication {pub.get('key')}")

    def test_returns_content_string(self):
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        data = r.get_json()
        self.assertIn('content', data)
        self.assertIsInstance(data['content'], str)
        self.assertIn('doe2024', data['content'])

    def test_returns_path_string(self):
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        data = r.get_json()
        self.assertIn('path', data)
        self.assertIsInstance(data['path'], str)
        self.assertTrue(data['path'].endswith('.bib'))

    def test_returns_count(self):
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        data = r.get_json()
        self.assertIn('count', data)
        self.assertIsInstance(data['count'], int)
        self.assertGreaterEqual(data['count'], 1)

    def test_empty_bib_returns_empty_list(self):
        tmp   = tempfile.TemporaryDirectory()
        path  = Path(tmp.name)
        app, sid, stack = _make_app_and_client(path, bib_content='')
        try:
            with app.test_client() as c:
                r    = _get(c, '/api/master-data/publications', sid)
                pubs = r.get_json()['publications']
                self.assertEqual(pubs, [])
        finally:
            stack.close()
            tmp.cleanup()

    def test_missing_session_returns_400(self):
        r = self.client.get('/api/master-data/publications')
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/master-data/publication  — add
# ---------------------------------------------------------------------------

class TestAddPublication(unittest.TestCase):
    """Tests for action='add' on POST /api/master-data/publication."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _add(self, key, entry_type='article', fields=None):
        payload = {
            'action': 'add',
            'key':    key,
            'type':   entry_type,
            'fields': fields or {
                'author': 'New, Author',
                'title':  'New Paper',
                'year':   '2025',
            },
        }
        return _post(self.client, '/api/master-data/publication', self.sid, payload)

    def test_add_returns_200(self):
        r = self._add('newpub2025')
        self.assertEqual(r.status_code, 200)

    def test_add_returns_ok_true(self):
        r = self._add('newpub2025')
        self.assertTrue(r.get_json().get('ok'))

    def test_add_action_in_response(self):
        r = self._add('newpub2025')
        self.assertEqual(r.get_json().get('action'), 'add')

    def test_add_key_in_response(self):
        r = self._add('newpub2025')
        self.assertEqual(r.get_json().get('key'), 'newpub2025')

    def test_add_persists_to_bib_file(self):
        self._add('newpub2025')
        bib_text = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.assertIn('newpub2025', bib_text)

    def test_add_appears_in_subsequent_get(self):
        self._add('newpub2025')
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        keys = [p['key'] for p in r.get_json()['publications']]
        self.assertIn('newpub2025', keys)

    def test_add_duplicate_key_returns_409(self):
        # doe2024 already exists from sample bib
        r = self._add('doe2024')
        self.assertEqual(r.status_code, 409)

    def test_add_missing_key_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'type':   'article',
            'fields': {'author': 'X', 'title': 'Y', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 400)

    def test_add_missing_type_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'newkey',
            'fields': {'author': 'X', 'title': 'Y', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 400)

    def test_add_missing_fields_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'newkey',
            'type':   'article',
        })
        self.assertEqual(r.status_code, 400)

    def test_add_missing_title_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'nokey',
            'type':   'article',
            'fields': {'author': 'X', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 400)

    def test_add_missing_year_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'nokey',
            'type':   'article',
            'fields': {'author': 'X', 'title': 'T'},
        })
        self.assertEqual(r.status_code, 400)

    def test_add_missing_author_and_editor_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'nokey',
            'type':   'article',
            'fields': {'title': 'T', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 400)

    def test_add_with_editor_instead_of_author_accepted(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'add',
            'key':    'edited2025',
            'type':   'book',
            'fields': {'editor': 'Ed, Itor', 'title': 'Edited Vol', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 200)

    def test_invalid_action_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'patch',
            'key':    'doe2024',
        })
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/master-data/publication  — update
# ---------------------------------------------------------------------------

class TestUpdatePublication(unittest.TestCase):
    """Tests for action='update' on POST /api/master-data/publication."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _update(self, key='doe2024', fields=None):
        return _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'update',
            'key':    key,
            'type':   'article',
            'fields': fields or {
                'author': 'Doe, Jane',
                'title':  'Updated Title',
                'year':   '2024',
            },
        })

    def test_update_existing_returns_200(self):
        r = self._update()
        self.assertEqual(r.status_code, 200)

    def test_update_ok_true(self):
        r = self._update()
        self.assertTrue(r.get_json().get('ok'))

    def test_update_action_in_response(self):
        r = self._update()
        self.assertEqual(r.get_json().get('action'), 'update')

    def test_update_persists_change(self):
        self._update(fields={
            'author': 'Doe, Jane',
            'title':  'Updated Title',
            'year':   '2024',
        })
        bib_text = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.assertIn('Updated Title', bib_text)

    def test_update_nonexistent_key_adds_it(self):
        """action='update' for a key that does not exist should create it."""
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'update',
            'key':    'brandnew999',
            'type':   'misc',
            'fields': {'author': 'X', 'title': 'T', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 200)

    def test_update_missing_key_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'update',
            'type':   'article',
            'fields': {'author': 'X', 'title': 'T', 'year': '2025'},
        })
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/master-data/publication  — delete
# ---------------------------------------------------------------------------

class TestDeletePublication(unittest.TestCase):
    """Tests for action='delete' on POST /api/master-data/publication."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _delete(self, key='doe2024'):
        return _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'delete',
            'key':    key,
        })

    def test_delete_existing_returns_200(self):
        r = self._delete()
        self.assertEqual(r.status_code, 200)

    def test_delete_ok_true(self):
        r = self._delete()
        self.assertTrue(r.get_json().get('ok'))

    def test_delete_action_in_response(self):
        r = self._delete()
        self.assertEqual(r.get_json().get('action'), 'deleted')

    def test_delete_removes_from_bib_file(self):
        self._delete()
        bib_text = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.assertNotIn('doe2024', bib_text)

    def test_delete_removed_from_subsequent_get(self):
        self._delete()
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        keys = [p['key'] for p in r.get_json()['publications']]
        self.assertNotIn('doe2024', keys)

    def test_delete_nonexistent_returns_404(self):
        r = self._delete('nosuchkey')
        self.assertEqual(r.status_code, 404)

    def test_delete_missing_key_returns_400(self):
        r = _post(self.client, '/api/master-data/publication', self.sid, {
            'action': 'delete',
        })
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/master-data/publications/import
# ---------------------------------------------------------------------------

class TestImportPublications(unittest.TestCase):
    """Tests for POST /api/master-data/publications/import."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _import(self, bibtex_text: str, overwrite: bool = False):
        return _post(self.client, '/api/master-data/publications/import', self.sid, {
            'bibtex_text': bibtex_text,
            'overwrite':   overwrite,
        })

    def test_import_returns_200(self):
        r = self._import(IMPORT_BIB_TEXT)
        self.assertEqual(r.status_code, 200)

    def test_import_ok_true(self):
        r    = self._import(IMPORT_BIB_TEXT)
        data = r.get_json()
        self.assertTrue(data.get('ok'))

    def test_import_reports_added_count(self):
        r    = self._import(IMPORT_BIB_TEXT)
        data = r.get_json()
        self.assertEqual(data.get('added'), 2)

    def test_import_reports_skipped_zero_on_new(self):
        r    = self._import(IMPORT_BIB_TEXT)
        data = r.get_json()
        self.assertEqual(data.get('skipped'), 0)

    def test_import_new_entries_in_get(self):
        self._import(IMPORT_BIB_TEXT)
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        keys = [p['key'] for p in r.get_json()['publications']]
        self.assertIn('smith2023', keys)
        self.assertIn('jones2022', keys)

    def test_import_duplicate_skipped_by_default(self):
        # doe2024 already exists; IMPORT_BIB_TEXT adds smith2023 + jones2022
        duplicate_bib = SAMPLE_BIB_TEXT  # same key as existing
        r    = self._import(duplicate_bib, overwrite=False)
        data = r.get_json()
        self.assertEqual(data.get('added'),   0)
        self.assertEqual(data.get('skipped'), 1)

    def test_import_duplicate_overwritten_when_flag_set(self):
        duplicate_bib = SAMPLE_BIB_TEXT  # same doe2024 key
        r    = self._import(duplicate_bib, overwrite=True)
        data = r.get_json()
        self.assertEqual(data.get('updated'), 1)
        self.assertEqual(data.get('skipped'), 0)

    def test_import_reports_total(self):
        self._import(IMPORT_BIB_TEXT)
        r     = self._import(IMPORT_BIB_TEXT, overwrite=False)
        data  = r.get_json()
        # 1 (from sample) + 2 new = 3 total stored
        self.assertIn('total', data)

    def test_import_empty_text_returns_400(self):
        r = self._import('')
        self.assertEqual(r.status_code, 400)

    def test_import_invalid_bibtex_returns_400(self):
        r = self._import('this is not bibtex at all @@@@')
        self.assertIn(r.status_code, (400, 500))

    def test_import_persists_to_file(self):
        self._import(IMPORT_BIB_TEXT)
        bib_text = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.assertIn('smith2023', bib_text)


# ---------------------------------------------------------------------------
# POST /api/master-data/publications/convert
# ---------------------------------------------------------------------------

class TestConvertPublicationsEndpoint(unittest.TestCase):
    """Tests for POST /api/master-data/publications/convert."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _convert(self, text: str):
        return _post(self.client, '/api/master-data/publications/convert', self.sid, {
            'text': text,
        })

    def test_convert_calls_llm_and_returns_200(self):
        self.app.mock_llm.convert_text_to_bibtex = MagicMock(
            return_value='@article{test2025, author={T}, title={T}, year={2025}}'
        )
        r = self._convert('Doe, J. (2025). Test. Journal, 1(1), 1-5.')
        self.assertEqual(r.status_code, 200)

    def test_convert_ok_true(self):
        self.app.mock_llm.convert_text_to_bibtex = MagicMock(
            return_value='@article{test2025, author={T}, title={T}, year={2025}}'
        )
        r    = self._convert('some citation text')
        data = r.get_json()
        self.assertTrue(data.get('ok'))

    def test_convert_returns_bibtex_string(self):
        expected = '@article{test2025, author={T}, title={T}, year={2025}}'
        self.app.mock_llm.convert_text_to_bibtex = MagicMock(return_value=expected)
        r    = self._convert('some citation text')
        data = r.get_json()
        self.assertIn('bibtex', data)
        self.assertEqual(data['bibtex'], expected)

    def test_convert_does_not_save_to_bib_file(self):
        original = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.app.mock_llm.convert_text_to_bibtex = MagicMock(
            return_value='@article{injected2025, author={X}, title={Y}, year={2025}}'
        )
        self._convert('any text')
        after = (self.path / 'publications.bib').read_text(encoding='utf-8')
        self.assertEqual(original, after)

    def test_convert_empty_text_returns_400(self):
        r = self._convert('')
        self.assertEqual(r.status_code, 400)

    def test_convert_llm_error_returns_500(self):
        from utils.llm_client import LLMError
        self.app.mock_llm.convert_text_to_bibtex = MagicMock(
            side_effect=LLMError('LLM failed')
        )
        r = self._convert('some text')
        self.assertEqual(r.status_code, 500)

    def test_convert_no_llm_configured_returns_503(self):
        """When the session has no LLM configured, endpoint should return 503."""
        registry = self.app.session_registry
        entry    = registry.get(self.sid)
        original_llm = entry.orchestrator.llm
        entry.orchestrator.llm = None
        try:
            r = self._convert('text')
            self.assertEqual(r.status_code, 503)
        finally:
            entry.orchestrator.llm = original_llm


# ---------------------------------------------------------------------------
# PUT /api/master-data/publications  (raw BibTeX save)
# ---------------------------------------------------------------------------

class TestRawSavePublications(unittest.TestCase):
    """Tests for PUT /api/master-data/publications."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _put_bib(self, content: str):
        return _put(self.client, '/api/master-data/publications', self.sid, {'content': content})

    def test_save_valid_bibtex_returns_200(self):
        r = self._put_bib(SAMPLE_BIB_TEXT)
        self.assertEqual(r.status_code, 200)

    def test_save_valid_bibtex_ok_true(self):
        r = self._put_bib(SAMPLE_BIB_TEXT)
        self.assertTrue(r.get_json()['ok'])

    def test_save_returns_count(self):
        r    = self._put_bib(SAMPLE_BIB_TEXT)
        data = r.get_json()
        self.assertIn('count', data)
        self.assertGreaterEqual(data['count'], 1)

    def test_save_persists_to_file(self):
        new_bib = '@article{new2025, author={New, Author}, title={New Work}, journal={J}, year={2025},}\n'
        self._put_bib(new_bib)
        content = self.app.pubs_path.read_text()
        self.assertIn('new2025', content)

    def test_save_updates_in_memory_publications(self):
        new_bib = '@article{mem2025, author={Mem, Author}, title={Memory Test}, journal={J}, year={2025},}\n'
        self._put_bib(new_bib)
        r    = _get(self.client, '/api/master-data/publications', self.sid)
        keys = [p['key'] for p in r.get_json()['publications']]
        self.assertIn('mem2025', keys)

    def test_save_empty_string_accepted(self):
        # Empty string is allowed (clears the file)
        r = self._put_bib('')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.get_json()['ok'])

    def test_save_invalid_bibtex_rejected_400(self):
        r = self._put_bib('this is not bibtex at all @@@')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.get_json()['ok'])

    def test_save_invalid_bibtex_does_not_modify_file(self):
        original = self.app.pubs_path.read_text()
        self._put_bib('garbage @@@@!')
        self.assertEqual(self.app.pubs_path.read_text(), original)

    def test_save_creates_backup(self):
        self._put_bib(IMPORT_BIB_TEXT)
        backup_dir = self.app.pubs_path.parent / 'backups'
        self.assertTrue(backup_dir.exists())
        backups = list(backup_dir.glob('*.bib'))
        self.assertGreater(len(backups), 0)

    def test_missing_session_returns_400(self):
        r = self.client.put(
            '/api/master-data/publications',
            json={'content': SAMPLE_BIB_TEXT},
            content_type='application/json',
        )
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/master-data/publications/validate
# ---------------------------------------------------------------------------

class TestValidatePublications(unittest.TestCase):
    """Tests for POST /api/master-data/publications/validate."""

    def setUp(self):
        self.tmp    = tempfile.TemporaryDirectory()
        self.path   = Path(self.tmp.name)
        self.app, self.sid, self._stack = _make_app_and_client(self.path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _validate(self, bibtex_text: str):
        return _post(self.client, '/api/master-data/publications/validate', self.sid,
                     {'bibtex_text': bibtex_text})

    def test_valid_bibtex_returns_200(self):
        r = self._validate(SAMPLE_BIB_TEXT)
        self.assertEqual(r.status_code, 200)

    def test_valid_bibtex_ok_true(self):
        r = self._validate(SAMPLE_BIB_TEXT)
        self.assertTrue(r.get_json()['ok'])

    def test_returns_count(self):
        r    = self._validate(SAMPLE_BIB_TEXT)
        data = r.get_json()
        self.assertIn('count', data)
        self.assertGreaterEqual(data['count'], 1)

    def test_returns_entries_list(self):
        r       = self._validate(IMPORT_BIB_TEXT)
        entries = r.get_json()['entries']
        self.assertIsInstance(entries, list)
        keys    = [e['key'] for e in entries]
        self.assertIn('smith2023', keys)
        self.assertIn('jones2022', keys)

    def test_each_entry_has_key_and_type(self):
        r       = self._validate(SAMPLE_BIB_TEXT)
        entries = r.get_json()['entries']
        for e in entries:
            self.assertIn('key',  e)
            self.assertIn('type', e)

    def test_empty_string_returns_ok_count_zero(self):
        r    = self._validate('')
        data = r.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['count'], 0)
        self.assertEqual(data['entries'], [])

    def test_whitespace_only_returns_ok_count_zero(self):
        r    = self._validate('   \n\t  ')
        data = r.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['count'], 0)

    def test_invalid_bibtex_returns_400(self):
        r = self._validate('@invalid{{{')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.get_json()['ok'])

    def test_validate_does_not_modify_file(self):
        original = self.app.pubs_path.read_text()
        self._validate(IMPORT_BIB_TEXT)  # different content
        self.assertEqual(self.app.pubs_path.read_text(), original)

    def test_missing_session_returns_400(self):
        r = self.client.post(
            '/api/master-data/publications/validate',
            json={'bibtex_text': SAMPLE_BIB_TEXT},
            content_type='application/json',
        )
        self.assertEqual(r.status_code, 400)


if __name__ == '__main__':
    unittest.main()
