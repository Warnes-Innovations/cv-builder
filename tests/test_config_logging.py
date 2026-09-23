# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Regression tests for scripts.utils.config.setup_logging().

Guards against a real production incident: the `%(user_id)s` formatter
field was only ever populated by a filter attached to the root Logger, so
records logged through *other* loggers (e.g. werkzeug, third-party
libraries) reached the handlers without `user_id` set and blew up the
formatter on every single non-request log line. Because Python's logging
module swallows formatter exceptions internally, this never crashed the
process or failed a health check -- it just silently corrupted logs, with
no test noticing.
"""

import io
import logging
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from scripts.utils.config import setup_logging


class TestSetupLoggingUserIdFilter(unittest.TestCase):
    """setup_logging() must tolerate records from any logger, not just root."""

    def setUp(self):
        # setup_logging() is a no-op if the root logger already has
        # handlers, so start each test from a clean slate and restore
        # afterward.
        self._root = logging.getLogger()
        self._orig_handlers = list(self._root.handlers)
        self._orig_filters = list(self._root.filters)
        self._orig_level = self._root.level
        self._root.handlers = []
        self._root.filters = []

    def tearDown(self):
        self._root.handlers = self._orig_handlers
        self._root.filters = self._orig_filters
        self._root.setLevel(self._orig_level)

    def _fake_config(self):
        cfg = MagicMock()
        cfg.log_level = "DEBUG"
        cfg.log_file = None
        cfg.log_dir = None
        return cfg

    def test_record_from_unrelated_logger_does_not_break_formatter(self):
        """A logger other than root (e.g. 'werkzeug') must format cleanly.

        This is the exact trigger from production: Werkzeug's own logger
        logs its startup banner, which propagates to root's handlers. Any
        handler whose formatter requires %(user_id)s must have the
        injecting filter on the *handler* itself, not just the root
        Logger -- logger-level filters only run for records logged
        directly through that logger, not ones propagated from elsewhere.
        """
        setup_logging(self._fake_config())

        handler = self._root.handlers[0]
        stream = io.StringIO()
        handler.stream = stream

        record = logging.LogRecord(
            name="werkzeug", level=logging.INFO, pathname=__file__,
            lineno=1, msg="Press CTRL+C to quit", args=(), exc_info=None,
        )

        # Handler.handle() runs the handler's filters, then emit()/format().
        # Before the fix, format() raises ValueError (missing %(user_id)s)
        # and logging swallows it internally as a silent "Logging error"
        # instead of the message ever reaching the stream.
        handler.handle(record)

        output = stream.getvalue()
        self.assertIn("Press CTRL+C to quit", output)
        self.assertIn("[-]", output)  # falls back to '-' with no request

    def test_handler_filters_include_user_id_injector(self):
        """Every handler setup_logging() installs must inject user_id.

        Guards against re-introducing the bug by re-attaching the filter
        to the root Logger only (logger-level filters don't run for
        records propagated from other loggers' own .handle() calls).
        """
        setup_logging(self._fake_config())

        self.assertTrue(
            self._root.handlers,
            "setup_logging() should add at least one handler",
        )
        for handler in self._root.handlers:
            filter_names = [type(f).__name__ for f in handler.filters]
            self.assertIn(
                "_RequestContextFilter", filter_names,
                f"{handler} is missing the user_id-injecting filter",
            )


class TestSetupLoggingLogDirOverride(unittest.TestCase):
    """An explicit log_dir (--log-dir) must outrank every configured path.

    Guards against a real defect: the UI test harness spawned the server
    with --output-dir pointing at a temp dir and believed itself isolated,
    but config.yaml sets logging.log_dir to the user's real
    ~/CV/cv-builder/logs, and log_dir's precedence chain
    (CV_LOG_DIR -> logging.log_dir -> output_dir/logs) meant --output-dir
    never reached a rung that could win. Every test run appended its
    session_id=test-session-id traffic to the user's live log.
    """

    def setUp(self):
        self._root = logging.getLogger()
        self._orig_handlers = list(self._root.handlers)
        self._orig_level = self._root.level
        self._root.handlers = []

    def tearDown(self):
        for handler in self._root.handlers:
            if isinstance(handler, logging.FileHandler):
                handler.close()
        self._root.handlers = self._orig_handlers
        self._root.setLevel(self._orig_level)

    def _file_handler_path(self) -> Path:
        """Absolute path of the installed rotating file handler.

        Fails the test rather than returning None, so each caller can use
        the result directly instead of re-asserting it is not None.
        """
        for handler in self._root.handlers:
            if isinstance(handler, logging.FileHandler):
                return Path(handler.baseFilename)
        self.fail("setup_logging() installed no file handler")

    def _config(self, log_dir, log_file):
        cfg = MagicMock()
        cfg.log_level = "DEBUG"
        cfg.log_dir = log_dir
        cfg.log_file = log_file
        return cfg

    def test_explicit_log_dir_overrides_configured_log_dir(self):
        """The exact production shape: config.yaml log_dir + bare filename."""
        with tempfile.TemporaryDirectory() as live, \
             tempfile.TemporaryDirectory() as isolated:
            setup_logging(
                self._config(live, "cv-builder.log"),
                log_dir=isolated,
            )

            written = self._file_handler_path()
            self.assertEqual(Path(isolated), written.parent)
            self.assertEqual("cv-builder.log", written.name)
            # The live log must not even be created.
            self.assertEqual(
                [], list(Path(live).iterdir()),
                "explicit log_dir was ignored; the live log dir was written to",
            )

    def test_explicit_log_dir_overrides_absolute_log_file(self):
        """An absolute logging.file must not escape the override.

        If this regresses, --log-dir silently does nothing for anyone who
        configured an absolute logging.file -- the same silent-ignore
        failure the flag was added to fix, one layer down.
        """
        with tempfile.TemporaryDirectory() as live, \
             tempfile.TemporaryDirectory() as isolated:
            absolute = str(Path(live) / "cv-builder.log")
            setup_logging(
                self._config(live, absolute),
                log_dir=isolated,
            )

            written = self._file_handler_path()
            self.assertEqual(Path(isolated), written.parent)
            self.assertFalse(
                Path(absolute).exists(),
                "absolute logging.file escaped the explicit log_dir override",
            )

    def test_configured_log_dir_still_used_when_no_override(self):
        """Without --log-dir, configured behaviour is unchanged."""
        with tempfile.TemporaryDirectory() as live:
            setup_logging(self._config(live, "cv-builder.log"))

            written = self._file_handler_path()
            self.assertEqual(Path(live), written.parent)


if __name__ == "__main__":
    unittest.main()
