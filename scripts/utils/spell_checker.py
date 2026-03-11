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

    def check(self, text: str, context: str = 'bullet') -> List[Dict]:
        """Spell/grammar check *text* in the given *context*.

        Args:
            text:    The raw text to check.
            context: ``"bullet"`` / ``"summary"`` / ``"skill"``

        Returns:
            List of suggestion dicts with keys:
            ``id, message, offset, length, replacements, category, rule_id, snippet``
        """
        if not text or not text.strip():
            return []

        # Skill names are not prose — skip all grammar checks.
        if context == 'skill':
            return []

        try:
            tool = self._get_tool()
            matches = tool.check(text)
        except Exception:
            return []

        custom_lower = {w.lower() for w in self._custom_words}
        suggestions: List[Dict] = []

        for m in matches:
            rule_id: str = getattr(m, 'ruleId', '') or ''

            # Suppress bullet-specific false positives.
            if context == 'bullet' and rule_id in self.SUPPRESSED_BULLET_RULES:
                continue

            # Skip if the flagged word is in the custom dictionary.
            flagged: str = text[m.offset:m.offset + m.errorLength]
            if flagged.lower() in custom_lower:
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

        return suggestions

    def close(self) -> None:
        """Shut down the LanguageTool JVM process."""
        if self._tool is not None:
            try:
                self._tool.close()
            except Exception:
                pass
            self._tool = None
