"""
SessionRegistry — manages multiple independent CV-builder sessions in memory.

Each session wraps a ConversationManager + CVOrchestrator pair, identified by
a short UUID.  The registry provides thread-safe creation, lookup, ownership
claiming, and idle eviction.
"""

from __future__ import annotations

import json
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable, Dict, Optional


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class SessionNotFoundError(Exception):
    """Raised when a requested session_id is not in the registry."""


class SessionOwnedError(Exception):
    """Raised when claiming a session already owned by a different token."""


# ---------------------------------------------------------------------------
# SessionEntry
# ---------------------------------------------------------------------------

@dataclass
class SessionEntry:
    """Holds all per-session objects and metadata."""

    session_id: str
    # Typed as object to avoid circular imports; callers cast as needed.
    manager: object       # ConversationManager
    orchestrator: object  # CVOrchestrator
    lock: threading.RLock  # per-session mutation lock
    owner_token: Optional[str]  # tab-local UUID; None = unclaimed
    created: datetime     # set at creation; displayed to user
    last_modified: datetime  # updated on mutations only (NOT on reads)


# ---------------------------------------------------------------------------
# Default factories (deferred imports so module-level import stays cheap)
# ---------------------------------------------------------------------------

def _default_build_objects(config):
    """
    Instantiate LLMClient, CVOrchestrator, and ConversationManager from
    *config*.  Imported lazily to avoid circular-import issues at module load.

    Returns (manager, orchestrator).
    """
    from .conversation_manager import ConversationManager  # noqa: PLC0415
    from .cv_orchestrator import CVOrchestrator            # noqa: PLC0415
    from .llm_client import LLMClient                     # noqa: PLC0415

    llm_client = LLMClient(config)
    orchestrator = CVOrchestrator(
        master_data_path=config.master_cv_path,
        publications_path=config.publications_path,
        output_dir=config.output_dir,
        llm_client=llm_client,
    )
    manager = ConversationManager(
        orchestrator=orchestrator,
        llm_client=llm_client,
        config=config,
    )
    return manager, orchestrator


# ---------------------------------------------------------------------------
# SessionRegistry
# ---------------------------------------------------------------------------

class SessionRegistry:
    """
    In-memory registry of active CV-builder sessions.

    Thread safety
    -------------
    - The internal ``_sessions`` dict is protected by a single
      registry-level ``_registry_lock`` (``threading.RLock``).
    - Per-session state mutation should be done while holding
      ``SessionEntry.lock``.
    - Different sessions have zero contention.

    Dependency injection
    --------------------
    Pass a *build_objects* callable to replace the default factory during
    tests.  Signature: ``build_objects(config) -> (manager, orchestrator)``.
    """

    def __init__(
        self,
        idle_timeout_minutes: int = 120,
        build_objects: Optional[Callable] = None,
    ) -> None:
        self._sessions: Dict[str, SessionEntry] = {}
        self._registry_lock = threading.RLock()
        self._idle_timeout = timedelta(minutes=idle_timeout_minutes)
        self._build_objects: Callable = (
            build_objects if build_objects is not None
            else _default_build_objects
        )

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def create(self, config) -> tuple[str, SessionEntry]:
        """
        Create a new session.

        Generates a short UUID, calls ``build_objects(config)`` to
        instantiate ConversationManager + CVOrchestrator, registers the
        entry, and returns ``(session_id, entry)``.
        """
        session_id = uuid.uuid4().hex[:8]
        now = datetime.now()

        manager, orchestrator = self._build_objects(config)
        manager.session_id = session_id

        entry = SessionEntry(
            session_id=session_id,
            manager=manager,
            orchestrator=orchestrator,
            lock=threading.RLock(),
            owner_token=None,
            created=now,
            last_modified=now,
        )

        with self._registry_lock:
            self._sessions[session_id] = entry

        return session_id, entry

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get(self, session_id: str) -> Optional[SessionEntry]:
        """
        Return the ``SessionEntry`` for *session_id*, or ``None``.

        Does **not** update ``last_modified``.
        """
        with self._registry_lock:
            return self._sessions.get(session_id)

    def get_or_404(self, session_id: str) -> SessionEntry:
        """
        Return the ``SessionEntry`` for *session_id*.

        Raises
        ------
        SessionNotFoundError
            If the session is not in the registry.
        """
        entry = self.get(session_id)
        if entry is None:
            raise SessionNotFoundError(
                f"Session not found: {session_id}"
            )
        return entry

    # ------------------------------------------------------------------
    # Mutation helpers
    # ------------------------------------------------------------------

    def touch(self, session_id: str) -> None:
        """
        Update ``last_modified`` to now.

        Called by state-mutating routes; must NOT be called by read-only
        routes.
        """
        with self._registry_lock:
            entry = self._sessions.get(session_id)
            if entry is not None:
                entry.last_modified = datetime.now()

    def claim(self, session_id: str, token: str) -> None:
        """
        Claim ownership of *session_id* with *token*.

        Succeeds if the session is unclaimed or already owned by the
        same token.

        Raises
        ------
        SessionNotFoundError
            If the session is not in the registry.
        SessionOwnedError
            If the session is already owned by a different token.
        """
        with self._registry_lock:
            entry = self._sessions.get(session_id)
            if entry is None:
                raise SessionNotFoundError(
                    f"Session not found: {session_id}"
                )
            if (
                entry.owner_token is None
                or entry.owner_token == token
            ):
                entry.owner_token = token
            else:
                raise SessionOwnedError(
                    f"Session {session_id} is already owned "
                    "by a different token"
                )

    def takeover(self, session_id: str, token: str) -> None:
        """
        Forcibly set ``owner_token`` to *token* regardless of current owner.

        Raises
        ------
        SessionNotFoundError
            If the session is not in the registry.
        """
        with self._registry_lock:
            entry = self._sessions.get(session_id)
            if entry is None:
                raise SessionNotFoundError(
                    f"Session not found: {session_id}"
                )
            entry.owner_token = token

    # ------------------------------------------------------------------
    # File I/O
    # ------------------------------------------------------------------

    def load_from_file(
        self, path: str, config
    ) -> tuple[str, SessionEntry]:
        """
        Load a session from a *session.json* file on disk.

        If a session with the same ``session_id`` is already registered,
        return the existing entry (idempotent — no duplicate).

        Parameters
        ----------
        path:
            Absolute path to ``session.json``.
        config:
            A ``Config`` instance.

        Returns
        -------
        (session_id, SessionEntry)
        """
        manager, orchestrator = self._build_objects(config)

        # load_session sets manager.session_id (generating one if absent)
        manager.load_session(path)
        session_id = manager.session_id

        with self._registry_lock:
            # Idempotent: return existing entry if already registered
            if session_id in self._sessions:
                return session_id, self._sessions[session_id]

            # Parse the creation timestamp from the file
            try:
                with open(path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                created = datetime.fromisoformat(
                    raw.get("timestamp", "")
                )
            except Exception:
                created = datetime.now()

            entry = SessionEntry(
                session_id=session_id,
                manager=manager,
                orchestrator=orchestrator,
                lock=threading.RLock(),
                owner_token=None,
                created=created,
                last_modified=datetime.now(),
            )
            self._sessions[session_id] = entry

        return session_id, entry

    # ------------------------------------------------------------------
    # Eviction
    # ------------------------------------------------------------------

    def evict_idle(self) -> None:
        """
        Save and remove sessions idle longer than ``idle_timeout_minutes``.

        Lazy — call at the start of each request.  Uses a snapshot of
        IDs to avoid holding the registry lock while calling
        ``_save_session()``.
        """
        now = datetime.now()

        with self._registry_lock:
            idle_ids = [
                sid
                for sid, e in self._sessions.items()
                if now - e.last_modified > self._idle_timeout
            ]

        for sid in idle_ids:
            with self._registry_lock:
                entry = self._sessions.get(sid)
                if entry is None:
                    continue  # already evicted by another thread
                manager = entry.manager
                last_mod = entry.last_modified

            # Re-check outside the lock (another thread may have touched it)
            if now - last_mod > self._idle_timeout:
                try:
                    manager._save_session()
                except Exception:
                    pass  # best-effort; still evict
                self.remove(sid)

    def remove(self, session_id: str) -> None:
        """Remove *session_id* from the registry without saving."""
        with self._registry_lock:
            self._sessions.pop(session_id, None)

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def all_active(self) -> list[SessionEntry]:
        """Return all currently in-memory session entries."""
        with self._registry_lock:
            return list(self._sessions.values())
