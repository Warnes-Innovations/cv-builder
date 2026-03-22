# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 4 — Quality-Gate Slice:
  GAP-08  Spell-check blocking guard and pending-item resolution
  GAP-24  Publication decisions persistence and accepted/rejected flow
          Publication first-author detection and heading count rendering

Covered scenarios
-----------------
  ConversationManager.complete_spell_check:
    - Empty audit advances phase to generation with zero counts
    - Accepted and ignored items counted correctly
    - Items still in 'pending' state are resolved to 'ignore' before persisting
    - Returns dict with flag_count, accepted_count, ignored_count, phase

  ConversationManager generate_cv (publication_decisions flow):
    - publication_decisions {True} values → accepted_publications list
    - publication_decisions {False} values → rejected_publications list
    - Mixed True/False → correct split across both lists
    - Empty publication_decisions → neither key injected into customizations
    - Legacy post_analysis_answers overrides publication_decisions when both present

  CVOrchestrator._format_publications:
    - Owner last name matches first author → is_first_author True
    - Owner last name not in first author → is_first_author False
    - No owner name in master_data → is_first_author False
    - 'formatted' key used directly as citation
    - Missing entry (no 'title' and no 'formatted') is skipped

  CVOrchestrator._select_content_hybrid (publication omission):
    - accepted_publications=[] → empty publications list in selected content
    - All publications accepted → full list in selected content
"""
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.conversation_manager import ConversationManager, Phase
from utils.cv_orchestrator import CVOrchestrator
from utils.llm_client import LLMClient
from utils.config import get_config


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

MINIMAL_MASTER_DATA: dict = {
    'personal_info': {
        'name': 'Warnes, Gregory R.',
        'title': 'Scientist',
        'contact': {
            'email': 'g@example.com',
            'phone': '5555555555',
            'linkedin': '',
            'github': '',
            'address': {'city': 'Boston', 'state': 'MA'},
        },
    },
    'experiences': [],
    'education': [],
    'skills': [],
    'achievements': [],
    'awards': [],
    'publications': [],
    'summaries': [{'summary': 'Experienced scientist.', 'audience': []}],
}


def _make_manager(tmp: Path) -> ConversationManager:
    master_path = tmp / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(MINIMAL_MASTER_DATA))
    pubs_path = tmp / 'publications.bib'
    pubs_path.touch()

    mock_llm = MagicMock(spec=LLMClient)
    orchestrator = CVOrchestrator(
        master_data_path=str(master_path),
        publications_path=str(pubs_path),
        output_dir=str(tmp),
        llm_client=mock_llm,
    )
    return ConversationManager(
        orchestrator=orchestrator,
        llm_client=mock_llm,
        config=get_config(),
    )


def _make_orchestrator(tmp: Path, owner_name: str = 'Warnes, Gregory R.') -> CVOrchestrator:
    tmp_path = Path(tmp)
    data = dict(MINIMAL_MASTER_DATA)
    data['personal_info'] = dict(data['personal_info'])
    data['personal_info']['name'] = owner_name
    master_path = tmp_path / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(data))
    pubs_path = tmp_path / 'publications.bib'
    pubs_path.touch()
    mock_llm = MagicMock(spec=LLMClient)
    return CVOrchestrator(
        master_data_path=str(master_path),
        publications_path=str(pubs_path),
        output_dir=str(tmp_path),
        llm_client=mock_llm,
    )


# ---------------------------------------------------------------------------
# complete_spell_check — happy path and edge cases
# ---------------------------------------------------------------------------

def test_complete_spell_check_empty_audit_advances_phase():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_manager(Path(tmp))
        manager.state['phase'] = Phase.SPELL_CHECK
        result = manager.complete_spell_check([])
        assert result['phase'] == 'generation'
        assert result['flag_count'] == 0
        assert result['accepted_count'] == 0
        assert result['ignored_count'] == 0
        assert manager.state['phase'] == Phase.GENERATION


def test_complete_spell_check_counts_accepted_and_ignored():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_manager(Path(tmp))
        audit = [
            {'outcome': 'accept', 'original': 'recieve', 'final': 'receive'},
            {'outcome': 'accept', 'original': 'occurence', 'final': 'occurrence'},
            {'outcome': 'ignore', 'original': 'sklearn', 'final': 'sklearn'},
            {'outcome': 'add_dict', 'original': 'PyTorch', 'final': 'PyTorch'},
            {'outcome': 'reject', 'original': 'teh', 'final': 'teh'},
        ]
        result = manager.complete_spell_check(audit)
        assert result['flag_count'] == 5
        assert result['accepted_count'] == 2
        assert result['ignored_count'] == 2  # ignore + add_dict
        assert result['phase'] == 'generation'


def test_complete_spell_check_pending_items_resolved_to_ignore():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_manager(Path(tmp))
        audit = [
            {'outcome': 'accept', 'original': 'recieve', 'final': 'receive'},
            {'outcome': 'pending', 'original': 'sklearn', 'final': 'sklearn'},
            {'outcome': 'pending', 'original': 'PyTorch', 'final': 'PyTorch'},
        ]
        result = manager.complete_spell_check(audit)
        # Pending items resolved to ignore
        persisted = manager.state['spell_audit']
        outcomes = [e['outcome'] for e in persisted]
        assert 'pending' not in outcomes
        assert outcomes.count('ignore') == 2
        assert result['ignored_count'] == 2
        assert result['accepted_count'] == 1


def test_complete_spell_check_persists_audit_to_state():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_manager(Path(tmp))
        audit = [{'outcome': 'accept', 'original': 'teh', 'final': 'the'}]
        manager.complete_spell_check(audit)
        assert manager.state['spell_audit'] == [{'outcome': 'accept', 'original': 'teh', 'final': 'the'}]


# ---------------------------------------------------------------------------
# publication_decisions → accepted_publications / rejected_publications
# ---------------------------------------------------------------------------

def _make_generate_cv_ready_manager(tmp: Path) -> ConversationManager:
    """Return a manager with minimal state needed for generate_cv to proceed."""
    manager = _make_manager(tmp)
    manager.state['job_analysis'] = {
        'title': 'Scientist', 'company': 'ACME', 'domain': '',
        'ats_keywords': [], 'experience_requirements': [],
    }
    manager.state['customizations'] = {
        'recommended_experiences': [], 'recommended_skills': [],
        'recommended_achievements': [], 'summary_focus': 'default',
    }
    return manager


def test_publication_decisions_true_values_become_accepted_publications():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_generate_cv_ready_manager(Path(tmp))
        manager.state['publication_decisions'] = {
            'pub_a': True,
            'pub_b': True,
            'pub_c': False,
        }
        captured = {}

        def fake_generate(job_analysis, customizations, **kwargs):
            captured['customizations'] = dict(customizations)
            return {'files': [], 'output_dir': str(tmp), 'generation_progress': []}

        manager.orchestrator.generate_cv = fake_generate
        manager._execute_action({'action': 'generate_cv'})

        assert set(captured['customizations']['accepted_publications']) == {'pub_a', 'pub_b'}
        assert captured['customizations']['rejected_publications'] == ['pub_c']


def test_publication_decisions_all_false_become_empty_accepted():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_generate_cv_ready_manager(Path(tmp))
        manager.state['publication_decisions'] = {
            'pub_a': False,
            'pub_b': False,
        }
        captured = {}

        def fake_generate(job_analysis, customizations, **kwargs):
            captured['customizations'] = dict(customizations)
            return {'files': [], 'output_dir': str(tmp), 'generation_progress': []}

        manager.orchestrator.generate_cv = fake_generate
        manager._execute_action({'action': 'generate_cv'})

        assert captured['customizations']['accepted_publications'] == []
        assert set(captured['customizations']['rejected_publications']) == {'pub_a', 'pub_b'}


def test_publication_decisions_empty_dict_leaves_no_accepted_rejected():
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_generate_cv_ready_manager(Path(tmp))
        manager.state['publication_decisions'] = {}
        captured = {}

        def fake_generate(job_analysis, customizations, **kwargs):
            captured['customizations'] = dict(customizations)
            return {'files': [], 'output_dir': str(tmp), 'generation_progress': []}

        manager.orchestrator.generate_cv = fake_generate
        manager._execute_action({'action': 'generate_cv'})

        assert 'accepted_publications' not in captured['customizations']
        assert 'rejected_publications' not in captured['customizations']


def test_legacy_post_analysis_answers_overrides_publication_decisions():
    """post_analysis_answers strings take precedence over publication_decisions dict."""
    with tempfile.TemporaryDirectory() as tmp:
        manager = _make_generate_cv_ready_manager(Path(tmp))
        manager.state['publication_decisions'] = {'pub_a': True, 'pub_b': True}
        manager.state['post_analysis_answers'] = {
            'publication_accepted': 'pub_x, pub_y',
            'publication_rejected': 'pub_z',
        }
        captured = {}

        def fake_generate(job_analysis, customizations, **kwargs):
            captured['customizations'] = dict(customizations)
            return {'files': [], 'output_dir': str(tmp), 'generation_progress': []}

        manager.orchestrator.generate_cv = fake_generate
        manager._execute_action({'action': 'generate_cv'})

        # Legacy path overwrites the dict-based path
        assert set(captured['customizations']['accepted_publications']) == {'pub_x', 'pub_y'}
        assert captured['customizations']['rejected_publications'] == ['pub_z']


# ---------------------------------------------------------------------------
# _format_publications — first-author detection
# ---------------------------------------------------------------------------

def test_format_publications_first_author_detected():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp, owner_name='Warnes, Gregory R.')
        pubs = [
            {
                'key': 'warnes2020',
                'title': 'A Great Study',
                'authors': 'Warnes, Gregory R. and Smith, John',
                'year': '2020',
                'journal': 'Nature',
            }
        ]
        result = orc._format_publications(pubs)
        assert len(result) == 1
        assert result[0]['is_first_author'] is True


def test_format_publications_not_first_author():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp, owner_name='Warnes, Gregory R.')
        pubs = [
            {
                'key': 'smith2020',
                'title': 'Another Study',
                'authors': 'Smith, John and Warnes, Gregory R.',
                'year': '2020',
                'journal': 'Science',
            }
        ]
        result = orc._format_publications(pubs)
        assert len(result) == 1
        assert result[0]['is_first_author'] is False


def test_format_publications_no_owner_name_is_false():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp, owner_name='')
        pubs = [
            {
                'key': 'anon2020',
                'title': 'Anon Study',
                'authors': 'Smith, John',
                'year': '2020',
                'journal': 'Cell',
            }
        ]
        result = orc._format_publications(pubs)
        assert len(result) == 1
        assert result[0]['is_first_author'] is False


def test_format_publications_formatted_key_used_directly():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp)
        pubs = [{'key': 'p1', 'formatted': 'Smith J. (2020). A paper. Nature.', 'authors': 'Smith, J.', 'year': '2020'}]
        result = orc._format_publications(pubs)
        assert result[0]['formatted_citation'] == 'Smith J. (2020). A paper. Nature.'


def test_format_publications_skips_entries_without_title_or_formatted():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp)
        pubs = [{'key': 'bad_entry', 'year': '2020'}]
        result = orc._format_publications(pubs)
        assert result == []


def test_format_publications_citation_built_from_title_fields():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp, owner_name='Jones, Alice')
        pubs = [
            {
                'key': 'jones2021',
                'title': 'New Horizons',
                'authors': 'Jones, Alice and Doe, Bob',
                'year': '2021',
                'journal': 'Cell',
            }
        ]
        result = orc._format_publications(pubs)
        assert 'New Horizons' in result[0]['formatted_citation']
        assert result[0]['is_first_author'] is True


# ---------------------------------------------------------------------------
# _select_content_hybrid — publication omission when all rejected
# ---------------------------------------------------------------------------

def test_all_publications_rejected_gives_empty_list():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp)
        job = {'title': 'Scientist', 'domain': '', 'ats_keywords': [], 'experience_requirements': []}
        customizations = {
            'accepted_publications': [],
            'rejected_publications': ['pub_a', 'pub_b'],
            'summary_focus': 'default',
        }
        # patch _select_publications so test doesn't need real BibTeX data
        with patch.object(orc, '_select_publications', return_value=[
            {'key': 'pub_a', 'title': 'A', 'authors': 'X', 'year': '2020'},
            {'key': 'pub_b', 'title': 'B', 'authors': 'Y', 'year': '2021'},
        ]):
            content = orc._select_content_hybrid(job, customizations)
        assert content['publications'] == []


def test_accepted_publications_subset_is_respected():
    with tempfile.TemporaryDirectory() as tmp:
        orc = _make_orchestrator(tmp)
        job = {'title': 'Scientist', 'domain': '', 'ats_keywords': [], 'experience_requirements': []}
        customizations = {
            'accepted_publications': ['pub_a'],
            'rejected_publications': ['pub_b'],
            'summary_focus': 'default',
        }
        with patch.object(orc, '_select_publications', return_value=[
            {'key': 'pub_a', 'title': 'A', 'authors': 'X', 'year': '2020'},
            {'key': 'pub_b', 'title': 'B', 'authors': 'Y', 'year': '2021'},
        ]):
            content = orc._select_content_hybrid(job, customizations)
        keys = [p['key'] for p in content['publications']]
        assert keys == ['pub_a']
