"""
Unit tests for SessionRegistry, SessionEntry, and session_id persistence
in ConversationManager.

ConversationManager and CVOrchestrator are injected as mocks via the
``build_objects`` factory parameter of ``SessionRegistry``, so no real
LLM config or filesystem infrastructure is required.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import unittest
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock

from scripts.utils.session_registry import (
    SessionEntry,
    SessionNotFoundError,
    SessionOwnedError,
    SessionRegistry,
)


# ---------------------------------------------------------------------------
# Test helpers / factories
# ---------------------------------------------------------------------------

def _make_mock_manager(session_id: str | None = None) -> MagicMock:
    """Return a mock that behaves enough like ConversationManager."""
    mgr = MagicMock()
    mgr.session_id = session_id
    mgr._save_session = MagicMock()
    return mgr


def _make_mock_orchestrator() -> MagicMock:
    return MagicMock()


def _make_build_objects(
    session_id: str | None = None,
) -> tuple[MagicMock, MagicMock, callable]:
    """
    Return (mock_manager, mock_orchestrator, build_objects_fn).

    The returned ``build_objects`` factory always yields the same pair so
    tests can introspect the mocks after ``registry.create()`` or
    ``registry.load_from_file()``.
    """
    mgr = _make_mock_manager(session_id)
    orch = _make_mock_orchestrator()

    def build_objects(config):
        return mgr, orch

    return mgr, orch, build_objects


def _make_entry(session_id: str | None = None, **kwargs) -> SessionEntry:
    """Convenience factory for SessionEntry with sensible defaults."""
    sid = session_id or uuid.uuid4().hex[:8]
    now = datetime.now()
    defaults = dict(
        session_id=sid,
        manager=_make_mock_manager(sid),
        orchestrator=_make_mock_orchestrator(),
        lock=threading.RLock(),
        owner_token=None,
        created=now,
        last_modified=now,
    )
    defaults.update(kwargs)
    return SessionEntry(**defaults)


def _make_registry_with_entry(
    session_id: str | None = None,
) -> tuple[SessionRegistry, str, SessionEntry]:
    """Return a registry pre-populated with one mock entry."""
    reg = SessionRegistry(idle_timeout_minutes=120)
    entry = _make_entry(session_id=session_id)
    with reg._registry_lock:
        reg._sessions[entry.session_id] = entry
    return reg, entry.session_id, entry


def _write_session_file(
    tmp_dir: str, session_id: str | None = None
) -> str:
    """Write a minimal session.json and return its path."""
    data: dict = {
        "timestamp": "2026-03-18T14:00:00",
        "state": {
            "phase": "init",
            "position_name": None,
            "job_description": None,
            "job_analysis": None,
            "post_analysis_questions": [],
            "post_analysis_answers": {},
            "customizations": None,
            "generated_files": None,
            "pending_rewrites": None,
            "persuasion_warnings": [],
            "generation_progress": [],
            "approved_rewrites": [],
            "rewrite_audit": [],
            "layout_instructions": [],
            "cover_letter_text": None,
            "cover_letter_params": None,
            "cover_letter_reused_from": None,
            "screening_responses": [],
            "experience_decisions": {},
            "skill_decisions": {},
            "achievement_decisions": {},
            "publication_decisions": {},
            "summary_focus_override": None,
            "extra_skills": [],
        },
        "conversation_history": [],
    }
    if session_id is not None:
        data["session_id"] = session_id
    path = os.path.join(tmp_dir, "session.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return path


# ---------------------------------------------------------------------------
# Tests: SessionRegistry.create()
# ---------------------------------------------------------------------------

class TestCreateSession(unittest.TestCase):

    def test_create_session(self):
        """New session: unique ID, correct fields, owner_token is None."""
        mgr, orch, build = _make_build_objects()
        reg = SessionRegistry(build_objects=build)

        sid, entry = reg.create(config=MagicMock())

        self.assertIsNotNone(sid)
        self.assertEqual(len(sid), 8)
        self.assertIsInstance(entry, SessionEntry)
        self.assertEqual(entry.session_id, sid)
        self.assertIsNone(entry.owner_token)
        self.assertIsInstance(entry.created, datetime)
        self.assertIsInstance(entry.last_modified, datetime)
        # session_id must be propagated to the manager
        self.assertEqual(mgr.session_id, sid)

    def test_create_two_sessions_unique_ids(self):
        """Two sessions created in the same registry have different IDs."""
        managers = [_make_mock_manager(), _make_mock_manager()]
        call_index = {"n": 0}

        def build(config):
            i = call_index["n"]
            call_index["n"] += 1
            return managers[i], _make_mock_orchestrator()

        reg = SessionRegistry(build_objects=build)
        sid1, _ = reg.create(MagicMock())
        sid2, _ = reg.create(MagicMock())

        self.assertNotEqual(sid1, sid2)


# ---------------------------------------------------------------------------
# Tests: SessionRegistry.get() / get_or_404()
# ---------------------------------------------------------------------------

class TestGetSession(unittest.TestCase):

    def test_get_session_found(self):
        reg, sid, entry = _make_registry_with_entry()
        self.assertIs(reg.get(sid), entry)

    def test_get_session_not_found_returns_none(self):
        reg = SessionRegistry()
        self.assertIsNone(reg.get("nonexistent"))

    def test_get_or_404_raises_when_not_found(self):
        reg = SessionRegistry()
        with self.assertRaises(SessionNotFoundError):
            reg.get_or_404("nonexistent")

    def test_get_does_not_update_last_modified(self):
        """get() must not change last_modified."""
        past = datetime.now() - timedelta(minutes=10)
        reg, sid, entry = _make_registry_with_entry()
        entry.last_modified = past

        reg.get(sid)

        self.assertEqual(entry.last_modified, past)


# ---------------------------------------------------------------------------
# Tests: SessionRegistry.touch()
# ---------------------------------------------------------------------------

class TestTouch(unittest.TestCase):

    def test_touch_updates_last_modified(self):
        past = datetime.now() - timedelta(minutes=5)
        reg, sid, entry = _make_registry_with_entry()
        entry.last_modified = past

        reg.touch(sid)

        self.assertGreater(entry.last_modified, past)

    def test_touch_reflected_in_subsequent_get(self):
        past = datetime.now() - timedelta(minutes=5)
        reg, sid, entry = _make_registry_with_entry()
        entry.last_modified = past

        reg.touch(sid)
        fetched = reg.get(sid)

        self.assertGreater(fetched.last_modified, past)


# ---------------------------------------------------------------------------
# Tests: SessionRegistry.claim()
# ---------------------------------------------------------------------------

class TestClaim(unittest.TestCase):

    def test_claim_unclaimed(self):
        """Claim succeeds when owner_token is None."""
        reg, sid, entry = _make_registry_with_entry()
        reg.claim(sid, "tab-token-abc")
        self.assertEqual(entry.owner_token, "tab-token-abc")

    def test_claim_same_token(self):
        """Claim is idempotent when called again with same token."""
        reg, sid, entry = _make_registry_with_entry()
        entry.owner_token = "tab-token-abc"
        reg.claim(sid, "tab-token-abc")  # must not raise
        self.assertEqual(entry.owner_token, "tab-token-abc")

    def test_claim_conflict(self):
        """Claim raises SessionOwnedError when a different token owns it."""
        reg, sid, entry = _make_registry_with_entry()
        entry.owner_token = "existing-owner"
        with self.assertRaises(SessionOwnedError):
            reg.claim(sid, "new-owner")

    def test_claim_nonexistent_session(self):
        reg = SessionRegistry()
        with self.assertRaises(SessionNotFoundError):
            reg.claim("nonexistent", "some-token")


# ---------------------------------------------------------------------------
# Tests: SessionRegistry.takeover()
# ---------------------------------------------------------------------------

class TestTakeover(unittest.TestCase):

    def test_takeover(self):
        """takeover() sets new token regardless of existing owner."""
        reg, sid, entry = _make_registry_with_entry()
        entry.owner_token = "old-owner"
        reg.takeover(sid, "new-owner")
        self.assertEqual(entry.owner_token, "new-owner")

    def test_takeover_when_unclaimed(self):
        reg, sid, entry = _make_registry_with_entry()
        reg.takeover(sid, "some-token")
        self.assertEqual(entry.owner_token, "some-token")

    def test_takeover_nonexistent_session(self):
        reg = SessionRegistry()
        with self.assertRaises(SessionNotFoundError):
            reg.takeover("nonexistent", "token")


# ---------------------------------------------------------------------------
# Tests: Idle eviction
# ---------------------------------------------------------------------------

class TestIdleEviction(unittest.TestCase):

    def test_idle_eviction(self):
        """Session with last_modified older than timeout is evicted."""
        reg = SessionRegistry(idle_timeout_minutes=60)
        entry = _make_entry()
        entry.last_modified = datetime.now() - timedelta(minutes=61)
        with reg._registry_lock:
            reg._sessions[entry.session_id] = entry
        sid = entry.session_id

        reg.evict_idle()

        self.assertIsNone(reg.get(sid))

    def test_idle_eviction_keeps_recent_session(self):
        """Session within timeout is kept."""
        reg = SessionRegistry(idle_timeout_minutes=60)
        entry = _make_entry()
        entry.last_modified = datetime.now() - timedelta(minutes=30)
        with reg._registry_lock:
            reg._sessions[entry.session_id] = entry
        sid = entry.session_id

        reg.evict_idle()

        self.assertIsNotNone(reg.get(sid))

    def test_evict_saves_to_disk(self):
        """Evicted session has _save_session() called before removal."""
        reg = SessionRegistry(idle_timeout_minutes=60)
        entry = _make_entry()
        entry.last_modified = datetime.now() - timedelta(minutes=90)
        with reg._registry_lock:
            reg._sessions[entry.session_id] = entry

        reg.evict_idle()

        entry.manager._save_session.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: load_from_file()
# ---------------------------------------------------------------------------

class TestLoadFromFile(unittest.TestCase):

    def test_load_from_file(self):
        """load_from_file creates a new entry with the correct session_id."""
        expected_sid = "abcd1234"
        with tempfile.TemporaryDirectory() as tmp:
            path = _write_session_file(tmp, session_id=expected_sid)

            mgr = _make_mock_manager(session_id=expected_sid)
            mgr.load_session.side_effect = lambda p: None

            reg = SessionRegistry(
                build_objects=lambda cfg: (mgr, _make_mock_orchestrator())
            )
            sid, entry = reg.load_from_file(path, MagicMock())

        self.assertEqual(sid, expected_sid)
        self.assertEqual(entry.session_id, expected_sid)
        self.assertIsNone(entry.owner_token)
        self.assertIsInstance(entry.created, datetime)

    def test_load_already_active(self):
        """Loading the same file twice returns the same entry (no dup)."""
        expected_sid = "deadbeef"
        with tempfile.TemporaryDirectory() as tmp:
            path = _write_session_file(tmp, session_id=expected_sid)

            mgr1 = _make_mock_manager(session_id=expected_sid)
            mgr1.load_session.side_effect = lambda p: None
            mgr2 = _make_mock_manager(session_id=expected_sid)
            mgr2.load_session.side_effect = lambda p: None

            call_count = {"n": 0}
            managers = [mgr1, mgr2]

            def build(cfg):
                m = managers[call_count["n"]]
                call_count["n"] += 1
                return m, _make_mock_orchestrator()

            reg = SessionRegistry(build_objects=build)

            sid1, entry1 = reg.load_from_file(path, MagicMock())
            sid2, entry2 = reg.load_from_file(path, MagicMock())

        self.assertEqual(sid1, sid2)
        self.assertIs(entry1, entry2)

    def test_backward_compat_no_session_id(self):
        """
        ConversationManager.load_session() with no session_id in the file
        should generate one and save it back to disk.

        This test exercises the real ConversationManager (not mocked).
        """
        with tempfile.TemporaryDirectory() as tmp:
            path = _write_session_file(tmp, session_id=None)

            from scripts.utils.conversation_manager import ConversationManager

            mock_config = MagicMock()
            mock_config.get.return_value = tmp

            mgr = ConversationManager(
                orchestrator=MagicMock(),
                llm_client=MagicMock(),
                config=mock_config,
            )
            # Point session_dir at tmp so _save_session() writes there
            mgr.session_dir = Path(tmp)

            mgr.load_session(path)

            # Must have generated a session_id
            self.assertIsNotNone(mgr.session_id)
            self.assertEqual(len(mgr.session_id), 8)

            # Must have written it back to disk
            with open(path, "r", encoding="utf-8") as f:
                saved = json.load(f)
            self.assertEqual(saved.get("session_id"), mgr.session_id)


# ---------------------------------------------------------------------------
# Tests: all_active()
# ---------------------------------------------------------------------------

class TestAllActive(unittest.TestCase):

    def test_all_active_returns_all(self):
        reg = SessionRegistry()
        e1 = _make_entry()
        e2 = _make_entry()
        with reg._registry_lock:
            reg._sessions[e1.session_id] = e1
            reg._sessions[e2.session_id] = e2

        active = reg.all_active()

        self.assertEqual(len(active), 2)
        self.assertIn(e1, active)
        self.assertIn(e2, active)

    def test_all_active_empty(self):
        self.assertEqual(SessionRegistry().all_active(), [])


# ---------------------------------------------------------------------------
# Tests: concurrent access
# ---------------------------------------------------------------------------

class TestConcurrentAccess(unittest.TestCase):

    def test_concurrent_access_no_deadlock(self):
        """
        Two threads each create and access different sessions concurrently.
        Must complete without deadlock or data corruption within 5 seconds.
        """
        managers = [_make_mock_manager(), _make_mock_manager()]
        call_lock = threading.Lock()
        call_index = {"n": 0}

        def build(config):
            with call_lock:
                i = call_index["n"]
                call_index["n"] += 1
            return managers[i], _make_mock_orchestrator()

        reg = SessionRegistry(build_objects=build)
        errors: list[Exception] = []
        results: list[str] = []

        def worker():
            try:
                sid, entry = reg.create(MagicMock())
                results.append(sid)
                _ = reg.get(sid)
                reg.touch(sid)
                reg.claim(sid, "token-" + sid)
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=5)

        self.assertEqual(errors, [], f"Errors in threads: {errors}")
        self.assertEqual(len(results), 2)
        self.assertNotEqual(results[0], results[1])


# ---------------------------------------------------------------------------
# Tests: session_id persisted via ConversationManager
# ---------------------------------------------------------------------------

class TestSessionIdPersistence(unittest.TestCase):

    def test_session_id_written_to_json(self):
        """session_id is written to session.json on _save_session()."""
        with tempfile.TemporaryDirectory() as tmp:
            from scripts.utils.conversation_manager import (
                ConversationManager,
            )

            mock_config = MagicMock()
            mock_config.get.return_value = tmp

            mgr = ConversationManager(
                orchestrator=MagicMock(),
                llm_client=MagicMock(),
                config=mock_config,
            )
            mgr.session_dir = Path(tmp)
            mgr.session_id = "test1234"

            mgr._save_session()

            with open(Path(tmp) / "session.json", "r", encoding="utf-8") as f:
                data = json.load(f)

            self.assertEqual(data.get("session_id"), "test1234")

    def test_session_id_auto_generated_on_save(self):
        """If session_id is None, _save_session() generates one."""
        with tempfile.TemporaryDirectory() as tmp:
            from scripts.utils.conversation_manager import (
                ConversationManager,
            )

            mock_config = MagicMock()
            mock_config.get.return_value = tmp

            mgr = ConversationManager(
                orchestrator=MagicMock(),
                llm_client=MagicMock(),
                config=mock_config,
            )
            mgr.session_dir = Path(tmp)
            self.assertIsNone(mgr.session_id)

            mgr._save_session()

            self.assertIsNotNone(mgr.session_id)
            self.assertEqual(len(mgr.session_id), 8)


# ---------------------------------------------------------------------------
# Run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main()
