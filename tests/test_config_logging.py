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
import unittest
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


if __name__ == "__main__":
    unittest.main()
