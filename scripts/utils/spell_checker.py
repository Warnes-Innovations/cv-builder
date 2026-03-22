# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Context-aware spell/grammar checker wrapping language_tool_python.

The checker suppresses specific rules that generate false positives in CV content:
- Bullet context: SENTENCE_FRAGMENT, PUNCTUATION_PARAGRAPH (bullets are incomplete
  sentences by design, no trailing period required).
- Skill context: all grammar rules (skill names are not prose).

Words in the custom dictionary (~/.cv/custom_dictionary.json or provided path)
are silently skipped regardless of flagged rule.
"""

from __future__ import annotations

import json
import os
import re
from typing import Dict, List, Optional


class SpellChecker:
    """Lazy-initialised LanguageTool wrapper."""

    # Rules that produce noisy false positives in bullet context.
    SUPPRESSED_BULLET_RULES: frozenset = frozenset({
        'SENTENCE_FRAGMENT',
        'PUNCTUATION_PARAGRAPH',
        'UPPERCASE_SENTENCE_START',
        'WORD_CONTAINS_UNDERSCORE',
        'EN_UNPAIRED_BRACKETS',
    })
    SPELLING_RULE_HINTS: tuple = (
        'morfologik',
        'hunspell',
        'spelling',
        'misspell',
        'typo',
    )
    WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9+#./'-]*")

    DEFAULT_DICT_PATH = os.path.expanduser('~/CV/custom_dictionary.json')

    def __init__(self, custom_dict_path: Optional[str] = None) -> None:
        self.custom_dict_path = custom_dict_path or self.DEFAULT_DICT_PATH
        self._tool = None  # lazy-init to avoid JVM startup at import time
        self._custom_words: List[str] = self._load_custom_dict()

    # ------------------------------------------------------------------
    # Custom dictionary
    # ------------------------------------------------------------------

    def _load_custom_dict(self) -> List[str]:
        try:
            if os.path.exists(self.custom_dict_path):
                with open(self.custom_dict_path, encoding='utf-8') as fh:
                    data = json.load(fh)
                    if isinstance(data, list):
                        return [str(w) for w in data]
        except Exception:
            pass
        return []

    def _save_custom_dict(self) -> None:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(self.custom_dict_path)), exist_ok=True)
            with open(self.custom_dict_path, 'w', encoding='utf-8') as fh:
                json.dump(self._custom_words, fh, indent=2)
        except Exception:
            pass

    def get_custom_dict(self) -> List[str]:
        """Return a copy of the current custom word list."""
        return list(self._custom_words)

    def add_word(self, word: str) -> bool:
        """Add *word* to the custom dictionary.  Returns True if the word was new."""
        word = word.strip()
        if not word:
            return False
        lower = {w.lower() for w in self._custom_words}
        if word.lower() not in lower:
            self._custom_words.append(word)
            self._save_custom_dict()
            return True
        return False

    def prepopulate_from_skills(self, skills: List[str]) -> None:
        """Add technical skill names to the custom dictionary (prevents false positives)."""
        lower = {w.lower() for w in self._custom_words}
        changed = False
        for skill in skills:
            skill = skill.strip()
            if skill and skill.lower() not in lower:
                self._custom_words.append(skill)
                lower.add(skill.lower())
                changed = True
        if changed:
            self._save_custom_dict()

    # ------------------------------------------------------------------
    # LanguageTool
    # ------------------------------------------------------------------

    def _get_tool(self):
        if self._tool is None:
            import language_tool_python  # type: ignore
            self._tool = language_tool_python.LanguageTool('en-US')
        return self._tool

    @classmethod
    def _extract_words(cls, text: str) -> List[str]:
        """Return token-like words suitable for aggregate spell stats."""
        return cls.WORD_RE.findall(text or "")

    @staticmethod
    def _normalize_word(word: str) -> str:
        """Normalize tokens for aggregate word counting."""
        return word.lower().strip(".,;:!?\'\"()[]{}")

    def _build_stats(self, text: str) -> Dict:
        words = self._extract_words(text)
        normalized = [
            self._normalize_word(word)
            for word in words
            if self._normalize_word(word)
        ]
        custom_lower = {self._normalize_word(w) for w in self._custom_words}
        custom_matches = sum(1 for word in normalized if word in custom_lower)
        return {
            'word_count':         len(normalized),
            'unique_words':       len(set(normalized)),
            'custom_dict_words':  custom_matches,
            'custom_dict_hits':   0,
            'flagged_count':      0,
            'unknown_word_count': 0,
            'grammar_issue_count': 0,
        }

    @classmethod
    def _is_spelling_rule(cls, match) -> bool:
        """Return True when a LanguageTool match is spelling-focused."""
        rule_id = (getattr(match, 'ruleId', '') or '').lower()
        category = str(getattr(match, 'category', '') or '').lower()
        return any(hint in rule_id for hint in cls.SPELLING_RULE_HINTS) or any(
            hint in category for hint in cls.SPELLING_RULE_HINTS
        )

    def aggregate_stats(self, texts: List[str]) -> Dict:
        """Aggregate word statistics across multiple text fragments."""
        all_words: List[str] = []
        for text in texts or []:
            all_words.extend(self._extract_words(text))

        normalized = [
            self._normalize_word(word)
            for word in all_words
            if self._normalize_word(word)
        ]
        custom_lower = {self._normalize_word(w) for w in self._custom_words}
        return {
            'word_count':        len(normalized),
            'unique_words':      len(set(normalized)),
            'custom_dict_words': sum(1 for word in normalized if word in custom_lower),
        }

    def check(self, text: str, context: str = 'bullet') -> Dict:
        """Spell/grammar check *text* in the given *context*.

        Args:
            text:    The raw text to check.
            context: ``"bullet"`` / ``"summary"`` / ``"skill"``

        Returns:
            Dict with keys:
            - ``suggestions``: list of flagged-item dicts
            - ``stats``: dict with ``word_count``, ``unique_words``, ``custom_dict_hits``
        """
        stats: Dict = self._build_stats(text)

        if not text or not text.strip():
            return {'suggestions': [], 'stats': stats}

        try:
            tool = self._get_tool()
            matches = tool.check(text)
        except Exception:
            return {'suggestions': [], 'stats': stats}

        custom_lower = {w.lower() for w in self._custom_words}
        suggestions: List[Dict] = []
        unknown_word_spans = set()
        grammar_issue_spans = set()

        for m in matches:
            rule_id: str = getattr(m, 'ruleId', '') or ''

            # Suppress bullet-specific false positives.
            if context == 'bullet' and rule_id in self.SUPPRESSED_BULLET_RULES:
                continue

            # Skill-like content should only surface spelling issues, not grammar.
            if context == 'skill' and not self._is_spelling_rule(m):
                continue

            # Skip if the flagged word is in the custom dictionary.
            flagged: str = text[m.offset:m.offset + m.errorLength]
            if self._normalize_word(flagged) in custom_lower:
                stats['custom_dict_hits'] += 1
                continue

            # Build a short surrounding snippet for display (~30 chars either side).
            snip_start = max(0, m.offset - 30)
            snip_end   = min(len(text), m.offset + m.errorLength + 30)
            snippet    = text[snip_start:snip_end]
            if snip_start > 0:
                snippet = '…' + snippet
            if snip_end < len(text):
                snippet = snippet + '…'

            suggestions.append({
                'id':           f"{rule_id}_{m.offset}",
                'message':      m.message,
                'offset':       m.offset,
                'length':       m.errorLength,
                'flagged':      flagged,
                'replacements': list(m.replacements)[:5],
                'category':     getattr(m, 'category', ''),
                'rule_id':      rule_id,
                'snippet':      snippet,
            })
            if self._is_spelling_rule(m):
                unknown_word_spans.add((m.offset, m.errorLength, self._normalize_word(flagged)))
            else:
                grammar_issue_spans.add((m.offset, m.errorLength, rule_id))

        stats['flagged_count'] = len(suggestions)
        stats['unknown_word_count'] = len(unknown_word_spans)
        stats['grammar_issue_count'] = len(grammar_issue_spans)
        return {'suggestions': suggestions, 'stats': stats}

    def close(self) -> None:
        """Shut down the LanguageTool JVM process."""
        if self._tool is not None:
            try:
                self._tool.close()
            except Exception:
                pass
            self._tool = None
