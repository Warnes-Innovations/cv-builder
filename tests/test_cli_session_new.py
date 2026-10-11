# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""`cv-cli session new` must print a session_id that later commands can use.

Each CLI invocation is a separate process, so the id is only usable if the
session is on disk when `session new` returns (GitHub issue #151).
"""

import json

from click.testing import CliRunner

from cli import cli


def _run(args):
    result = CliRunner().invoke(cli, args)
    assert result.exit_code == 0, result.output
    # stdout must be pure JSON; library progress messages go to stderr.
    return json.loads(result.stdout)


def test_session_new_returns_persisted_session(monkeypatch, tmp_path, example_master_data):
    monkeypatch.setenv("CV_OUTPUT_DIR", str(tmp_path))

    out = _run(["session", "new"])

    assert out["session_id"]
    assert out["session_file"]
    saved = json.loads(open(out["session_file"], encoding="utf-8").read())
    assert saved["session_id"] == out["session_id"]


def test_session_new_id_is_usable_by_next_command(monkeypatch, tmp_path, example_master_data):
    monkeypatch.setenv("CV_OUTPUT_DIR", str(tmp_path))
    sid = _run(["session", "new"])["session_id"]
    job = tmp_path / "job.txt"
    job.write_text("Senior R developer, MMRM.", encoding="utf-8")

    _run(["--session-id", sid, "job", "submit-text", "--text-file", str(job)])

    status = _run(["--session-id", sid, "session", "status"])
    assert status["session_id"] == sid
    assert status["has_job_text"] is True
