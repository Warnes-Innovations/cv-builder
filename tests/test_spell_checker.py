import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.spell_checker import SpellChecker  # noqa: E402


def test_aggregate_stats_counts_words_unique_words_and_custom_matches():
    with tempfile.TemporaryDirectory() as tmp:
        checker = SpellChecker(custom_dict_path=str(Path(tmp) / "custom.json"))
        checker._custom_words = ["Acme", "Python"]

        stats = checker.aggregate_stats([
            "Acme builds Python tools.",
            "Python tools improve Acme analytics.",
        ])

        assert stats["word_count"] == 9
        assert stats["unique_words"] == 6
        assert stats["custom_dict_words"] == 4


def test_skill_context_filters_grammar_but_keeps_spelling_matches():
    with tempfile.TemporaryDirectory() as tmp:
        checker = SpellChecker(custom_dict_path=str(Path(tmp) / "custom.json"))
        fake_matches = [
            SimpleNamespace(
                ruleId="MORFOLOGIK_RULE_EN_US",
                offset=0,
                errorLength=7,
                message="Possible spelling mistake found.",
                replacements=["PyTorch"],
                category="TYPOS",
            ),
            SimpleNamespace(
                ruleId="EN_A_VS_AN",
                offset=9,
                errorLength=1,
                message='Use "an" instead of "a".',
                replacements=["an"],
                category="GRAMMAR",
            ),
        ]

        with patch.object(checker, "_get_tool", return_value=SimpleNamespace(check=lambda _text: fake_matches)):
            result = checker.check("PyTroch a", context="skill")

        assert len(result["suggestions"]) == 1
        assert result["suggestions"][0]["flagged"] == "PyTroch"
        assert result["stats"]["flagged_count"] == 1
        assert result["stats"]["unknown_word_count"] == 1
        assert result["stats"]["grammar_issue_count"] == 0


def test_grammar_issue_count_tracks_non_spelling_matches():
    with tempfile.TemporaryDirectory() as tmp:
        checker = SpellChecker(custom_dict_path=str(Path(tmp) / "custom.json"))
        fake_matches = [
            SimpleNamespace(
                ruleId="EN_A_VS_AN",
                offset=0,
                errorLength=1,
                message='Use "an" instead of "a".',
                replacements=["an"],
                category="GRAMMAR",
            ),
            SimpleNamespace(
                ruleId="UPPERCASE_SENTENCE_START",
                offset=2,
                errorLength=5,
                message="This sentence does not start with an uppercase letter.",
                replacements=["Apple"],
                category="CASING",
            ),
        ]

        with patch.object(checker, "_get_tool", return_value=SimpleNamespace(check=lambda _text: fake_matches)):
            result = checker.check("a apple", context="summary")

        assert result["stats"]["unknown_word_count"] == 0
        assert result["stats"]["grammar_issue_count"] == 2
