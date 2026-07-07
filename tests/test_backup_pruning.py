# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Tests for Master CV data backup pruning (GAP-19 16.6).

Covers the shared `prune_backups` helper (age-based, count-based, both
disabled, both combined) and the two new `Config` retention properties.
"""

import os
import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.utils.backup_helpers import prune_backups
from scripts.utils.config import Config


def _touch(path: Path, age_seconds: float = 0) -> None:
    path.write_text("{}")
    if age_seconds:
        stamp = time.time() - age_seconds
        os.utime(path, (stamp, stamp))


class TestPruneBackups(unittest.TestCase):
    def setUp(self):
        self._tmp = TemporaryDirectory()
        self.backup_dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_missing_dir_returns_empty(self):
        missing = self.backup_dir / "nope"
        self.assertEqual(prune_backups(missing, retention_days=30, max_count=50), [])

    def test_age_based_pruning(self):
        old = self.backup_dir / "Master_CV_20200101T000000Z.json"
        _touch(old, age_seconds=40 * 86400)
        new = self.backup_dir / "Master_CV_20260101T000000Z.json"
        _touch(new, age_seconds=1)

        deleted = prune_backups(self.backup_dir, retention_days=30, max_count=0)

        self.assertEqual(deleted, [old])
        self.assertFalse(old.exists())
        self.assertTrue(new.exists())

    def test_count_based_pruning_keeps_newest(self):
        paths = []
        for i in range(5):
            p = self.backup_dir / f"Master_CV_2026010{i}T000000Z.json"
            _touch(p, age_seconds=(5 - i) * 60)  # larger i => newer
            paths.append(p)

        deleted = prune_backups(self.backup_dir, retention_days=0, max_count=3)

        # The two oldest (index 0, 1) should be pruned; three newest survive.
        self.assertEqual(set(deleted), {paths[0], paths[1]})
        for p in paths[2:]:
            self.assertTrue(p.exists())

    def test_both_rules_disabled_prunes_nothing(self):
        p = self.backup_dir / "Master_CV_20200101T000000Z.json"
        _touch(p, age_seconds=365 * 86400)
        deleted = prune_backups(self.backup_dir, retention_days=0, max_count=0)
        self.assertEqual(deleted, [])
        self.assertTrue(p.exists())

    def test_non_matching_filenames_ignored(self):
        other = self.backup_dir / "unrelated.json"
        _touch(other, age_seconds=365 * 86400)
        deleted = prune_backups(self.backup_dir, retention_days=1, max_count=1)
        self.assertEqual(deleted, [])
        self.assertTrue(other.exists())

    def test_web_app_backup_naming_convention_matches_glob(self):
        # scripts/web_app.py's _save_master uses Master_CV_Data.<ts>.bak.json
        p = self.backup_dir / "Master_CV_Data.20200101_000000_000000.bak.json"
        _touch(p, age_seconds=365 * 86400)
        deleted = prune_backups(self.backup_dir, retention_days=30, max_count=0)
        self.assertEqual(deleted, [p])


class TestBackupRetentionConfig(unittest.TestCase):
    def test_defaults(self):
        with TemporaryDirectory() as tmp:
            cfg = Config(config_file=str(Path(tmp) / "nonexistent.yaml"), load_env=False)
            self.assertEqual(cfg.master_data_backup_retention_days, 30)
            self.assertEqual(cfg.master_data_backup_max_count, 50)

    def test_config_yaml_override(self):
        with TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "config.yaml"
            config_path.write_text("data:\n  backup_retention_days: 7\n  backup_max_count: 10\n")
            cfg = Config(config_file=str(config_path), load_env=False)
            self.assertEqual(cfg.master_data_backup_retention_days, 7)
            self.assertEqual(cfg.master_data_backup_max_count, 10)

    def test_env_var_override_takes_precedence(self):
        with TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "config.yaml"
            config_path.write_text("data:\n  backup_retention_days: 7\n  backup_max_count: 10\n")
            os.environ["CV_MASTER_DATA_BACKUP_RETENTION_DAYS"] = "3"
            os.environ["CV_MASTER_DATA_BACKUP_MAX_COUNT"] = "5"
            try:
                cfg = Config(config_file=str(config_path), load_env=False)
                self.assertEqual(cfg.master_data_backup_retention_days, 3)
                self.assertEqual(cfg.master_data_backup_max_count, 5)
            finally:
                del os.environ["CV_MASTER_DATA_BACKUP_RETENTION_DAYS"]
                del os.environ["CV_MASTER_DATA_BACKUP_MAX_COUNT"]


if __name__ == "__main__":
    unittest.main()
