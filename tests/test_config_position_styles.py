# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Tests for position-style presets (issue #131).

Guards two things:

1. The committed ``config.yaml`` must ship the ``position_styles`` block with
   the ``medical_clinical`` and ``industry_research`` presets, since these are
   user-facing, editable style options selectable via ``position_style_override``
   and auto-detected from a job description.

2. The merge / inference semantics in ``Config.position_styles`` and
   ``Config.get_position_style_for_domain`` must keep working when those
   config-added presets are present: new presets are added, existing
   bootstrap defaults (industry/academic/government) are preserved, the new
   presets are reachable for their own domains, and the pre-existing
   precedence (academic before config-added presets) is not regressed.
"""

import tempfile
import unittest
from pathlib import Path

import yaml

from scripts.utils.config import Config

REPO_CONFIG = Path(__file__).resolve().parent.parent / 'config.yaml'


def _write_config(tmpdir: str, mapping: dict) -> Path:
    """Write a config dict as YAML into tmpdir and return its path."""
    path = Path(tmpdir) / 'config.yaml'
    path.write_text(yaml.safe_dump(mapping, sort_keys=False))
    return path


class TestRepoConfigPositionStyles(unittest.TestCase):
    """The committed config.yaml must ship the #131 presets."""

    def test_config_yaml_defines_medical_clinical(self):
        cfg = Config(config_file=str(REPO_CONFIG), load_env=False)
        ps = cfg.position_styles
        self.assertIn('medical_clinical', ps)
        style = ps['medical_clinical']
        self.assertEqual(style['include_publications'], True)
        self.assertEqual(style['include_teaching'],    True)

    def test_config_yaml_defines_industry_research(self):
        cfg = Config(config_file=str(REPO_CONFIG), load_env=False)
        ps = cfg.position_styles
        self.assertIn('industry_research', ps)
        style = ps['industry_research']
        self.assertEqual(style['include_publications'], True)
        self.assertEqual(style['include_teaching'],    False)

    def test_bootstrap_defaults_preserved_alongside_new_presets(self):
        cfg = Config(config_file=str(REPO_CONFIG), load_env=False)
        keys = list(cfg.position_styles.keys())
        for key in ('industry', 'academic', 'government',
                    'medical_clinical', 'industry_research'):
            self.assertIn(key, keys)


class TestPositionStyleMerge(unittest.TestCase):
    """config.yaml presets merge with the built-in defaults."""

    def test_config_added_presets_append_to_defaults(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _write_config(tmpdir, {
                'position_styles': {
                    'medical_clinical': {'label': 'Med', 'include_publications': True},
                    'industry_research': {'label': 'Ind R&D'},
                },
            })
            cfg = Config(config_file=str(path), load_env=False)
        ps = cfg.position_styles
        # Built-ins survive.
        self.assertEqual(ps['industry']['include_publications'], False)
        self.assertEqual(ps['academic']['include_publications'],  True)
        # New presets are present with the fields they declare. (The engine
        # merges a brand-new preset verbatim -- it does not fill defaults for
        # unspecified keys -- so the committed config.yaml provides every
        # field explicitly; see TestRepoConfigPositionStyles.)
        self.assertEqual(ps['medical_clinical']['label'], 'Med')
        self.assertEqual(ps['medical_clinical']['include_publications'], True)
        self.assertNotIn('include_teaching', ps['medical_clinical'])
        self.assertEqual(ps['industry_research']['label'], 'Ind R&D')

    def test_config_override_updates_existing_default_key(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _write_config(tmpdir, {
                'position_styles': {
                    'academic': {'page_warn_above': 5.0},
                },
            })
            cfg = Config(config_file=str(path), load_env=False)
        ps = cfg.position_styles
        # Override applied; other academic fields preserved.
        self.assertEqual(ps['academic']['page_warn_above'], 5.0)
        self.assertEqual(ps['academic']['label'], 'Academic / Research')


class TestPositionStyleInference(unittest.TestCase):
    """get_position_style_for_domain resolves config-added presets."""

    def _cfg_with_new_presets(self, tmpdir: str) -> Config:
        path = _write_config(tmpdir, {
            'position_styles': {
                'medical_clinical': {
                    'label': 'Medical / Clinical',
                    'page_warn_above': None,
                    'include_publications': True,
                    'include_teaching': True,
                    'domain_terms': ['medical', 'healthcare', 'hospital',
                                     'nurse', 'physician'],
                },
                'industry_research': {
                    'label': 'Industry Research',
                    'page_warn_above': 4.0,
                    'include_publications': True,
                    'include_teaching': False,
                    'domain_terms': ['r&d', 'applied scientist',
                                     'research engineer'],
                },
            },
        })
        return Config(config_file=str(path), load_env=False)

    def test_medical_clinical_inferred(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cfg = self._cfg_with_new_presets(tmpdir)
            key, style = cfg.get_position_style_for_domain('Healthcare Operations Manager')
            self.assertEqual(key, 'medical_clinical')
            self.assertTrue(style['include_publications'])

    def test_industry_research_inferred(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cfg = self._cfg_with_new_presets(tmpdir)
            key, style = cfg.get_position_style_for_domain('R&D Engineer')
            self.assertEqual(key, 'industry_research')
            self.assertTrue(style['include_publications'])
            self.assertFalse(style['include_teaching'])

    def test_legacy_precedence_preserved(self):
        """Scientist/clinical titles still resolve to academic (bootstrap
        presets iterate before config-added ones)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            cfg = self._cfg_with_new_presets(tmpdir)
            key, _ = cfg.get_position_style_for_domain('Clinical Research Scientist')
            self.assertEqual(key, 'academic')

    def test_generic_role_falls_back_to_industry(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cfg = self._cfg_with_new_presets(tmpdir)
            key, _ = cfg.get_position_style_for_domain('ML Platform Engineer')
            self.assertEqual(key, 'industry')


class TestPositionStyleOverride(unittest.TestCase):
    """Config-added presets are selectable via position_style_override."""

    def test_new_presets_are_valid_override_targets(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _write_config(tmpdir, {
                'position_styles': {
                    'medical_clinical': {'label': 'Med'},
                    'industry_research': {'label': 'Ind R&D'},
                },
            })
            cfg = Config(config_file=str(path), load_env=False)
        for key in ('medical_clinical', 'industry_research'):
            self.assertIn(key, cfg.position_styles)
        self.assertEqual(cfg.position_styles['medical_clinical']['label'], 'Med')


if __name__ == '__main__':
    unittest.main()
