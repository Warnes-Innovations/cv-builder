"""
LLM Client abstraction for different providers.

Supports:
- OpenAI (GPT-4, etc.)
- Anthropic (Claude)
- Google Gemini
- Groq (Fast inference)
- Local models via transformers
- GitHub Copilot (if available)
"""

import os
import json
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod


def _normalize_github_model_id(model: str) -> str:
    """Normalize legacy GitHub Models IDs to currently accepted IDs."""
    legacy_aliases = {
        # Legacy ID kept for backward compatibility with saved sessions/config.
        "anthropic/claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    }
    return legacy_aliases.get(model, model)


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    # Populated after each chat() call with the provider usage object.
    # OpenAI/Groq/GitHub: .prompt_tokens/.completion_tokens
    # Anthropic: .input_tokens/.output_tokens
    last_usage: Any = None

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send messages and get response."""
        pass
    
    @abstractmethod
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using LLM."""
        pass
    
    @abstractmethod
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for CV customization."""
        pass
    
    @abstractmethod
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity score."""
        pass

    @abstractmethod
    def propose_rewrites(
        self,
        content: Dict,
        job_analysis: Dict,
        conversation_history: List[Dict] = None,
        user_preferences: Dict = None,
    ) -> List[Dict]:
        """Propose targeted text rewrites to align CV terminology with the job.

        Each proposal covers one section: professional summary, an experience
        bullet, or a skill entry.  Proposals are validated against
        :meth:`apply_rewrite_constraints`; items that fail are discarded.

        Args:
            content:      Selected CV content dict (keys: ``summary``,
                          ``experiences``, ``skills``, …).
            job_analysis: Output of :meth:`analyze_job_description`, providing
                          ``ats_keywords``, ``required_skills``, etc.

        Returns:
            A list of rewrite proposal dicts with the schema::

                {
                    "id":                  str,   # unique within this batch
                    "type":                str,   # "summary" | "bullet"
                                                  # | "skill_rename" | "skill_add"
                    "location":            str,   # e.g. "summary",
                                                  # "exp_001.achievements[2]",
                                                  # "skills.core[1]"
                    "original":            str,
                    "proposed":            str,
                    "keywords_introduced": List[str],
                    "evidence":            str,   # skill_add only —
                                                  # comma-sep exp IDs
                    "evidence_strength":   str,   # "strong" | "weak"
                                                  # (skill_add only)
                    "rationale":           str,
                }

            Always returns ``[]`` on parse/API failure — never raises.
        """
        pass

    def call_llm(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Call LLM with a single user prompt and optional system prompt.

        Convenience wrapper around :meth:`chat` for callers that work with a
        plain string prompt rather than a messages list.

        Args:
            prompt:        User-facing prompt text.
            system_prompt: Optional system/instruction prompt.
            temperature:   Sampling temperature passed to :meth:`chat`.
            max_tokens:    Token limit passed to :meth:`chat` (None = provider default).

        Returns:
            The model's response as a plain string.
        """
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return self.chat(messages, temperature=temperature, max_tokens=max_tokens)

    # ── Concrete helpers shared by all provider implementations ──────────────

    @staticmethod
    def apply_rewrite_constraints(original: str, proposed: str) -> bool:
        """Return ``True`` if *proposed* is an acceptable rewrite of *original*.

        Returns ``False`` (invalid) when the proposed text removes any number,
        date, or company/proper name present in the original.  This guards
        against rewrites that silently drop metrics, years, or employer names
        while substituting terminology.

        Args:
            original: The source text before rewriting.
            proposed: The candidate replacement text.

        Returns:
            ``True``  — rewrite is acceptable (no protected tokens removed).
            ``False`` — rewrite is invalid (at least one protected token lost).
        """
        import re

        # Words that may appear Title-Cased but are not proper nouns.
        _STOP_WORDS = frozenset({
            'The', 'A', 'An', 'And', 'Or', 'But', 'For', 'Nor', 'So', 'Yet',
            'At', 'By', 'In', 'Of', 'On', 'To', 'Up', 'As', 'Is', 'It',
            'This', 'That', 'With', 'From', 'Into', 'Than', 'Over', 'After',
            'Before', 'While', 'When', 'Where', 'Which', 'Who', 'How', 'What',
            'All', 'Both', 'Each', 'Few', 'More', 'Most', 'Other', 'Some',
            'Such', 'No', 'Not', 'Only', 'Same', 'Too', 'Very', 'Also',
            'Led', 'Used', 'Using', 'Developed', 'Managed', 'Designed',
            'Built', 'Created', 'Implemented', 'Delivered', 'Improved',
            'Reduced', 'Increased', 'Achieved', 'Drove', 'Supported',
            'Collaborated', 'Worked', 'Partnered', 'Helped', 'Ensured',
        })

        # 1. Numeric tokens — preserve all numbers, metrics, and percentages.
        nums_orig = set(re.findall(r'\d[\d,\.]*%?', original))
        nums_prop = set(re.findall(r'\d[\d,\.]*%?', proposed))
        if not nums_orig.issubset(nums_prop):
            return False

        # 2. Proper-name tokens — Title-Case words not in the stop-word list.
        def _extract_proper(text: str) -> set:
            words = re.findall(r"[A-Z][a-z][a-zA-Z&'\-]*", text)
            return {w for w in words if w not in _STOP_WORDS}

        proper_orig = _extract_proper(original)
        proper_prop = _extract_proper(proposed)
        if not proper_orig.issubset(proper_prop):
            return False

        return True

    # ── Persuasion Quality Checks (Phase 10) ────────────────────────────────

    # Approved strong action verbs for CV bullets
    # Approved strong action verbs for CV bullets (Phase 10)
    # Expert-curated past-tense verbs aligned with persuasion principles:
    # - Authority signals (Cialdini social proof)
    # - Results/outcome focus (impact over activity)
    # - Leadership and scale
    # Excludes: weak operational verbs, generic catch-alls, malformed entries
    _STRONG_ACTION_VERBS = {
        # Achievement & Results
        'accelerated', 'achieved', 'amplified', 'attained', 'captured',
        'commanded', 'completed', 'conquered', 'delivered', 'dominated',
        'drove', 'earned', 'enabled', 'exceeded', 'expanded',
        'expedited', 'generated', 'guaranteed', 'impacted', 'increased',
        'led', 'mastered', 'maximized', 'outperformed', 'produced',
        'realized', 'reduced', 'secured', 'surpassed', 'transformed',
        'triumphed', 'unlocked', 'won', 'yielded',

        # Leadership & Authority
        'architected', 'championed', 'chaired', 'coordinated', 'directed',
        'engineered', 'established', 'founded', 'governed', 'guided',
        'headed', 'inaugurated', 'initiated', 'instituted', 'launched',
        'managed', 'pioneered', 'spearheaded', 'steered', 'supervised',
        'orchestrated',

        # Innovation & Transformation
        'conceived', 'designed', 'devised', 'discovered', 'invented',
        'innovated', 'revolutionized', 'solved', 'created', 'developed',
        'formulated', 'originated',

        # Operational Excellence
        'automated', 'built', 'configured', 'constructed', 'deployed',
        'implemented', 'installed', 'integrated', 'optimized', 'rebuilt',
        'restructured', 'streamlined', 'systematized', 'upgraded', 'scaled',

        # Strategic & Analytical
        'analyzed', 'assessed', 'audited', 'benchmarked', 'calculated',
        'diagnosed', 'evaluated', 'examined', 'forecasted', 'identified',
        'investigated', 'measured', 'planned', 'predicted', 'prioritized',
        'proposed', 'researched', 'strategized', 'validated', 'verified',

        # Sales & Growth
        'acquired', 'closed', 'converted', 'cultivated', 'marketed',
        'negotiated', 'penetrated', 'sourced', 'captured',

        # Quality & Excellence
        'certified', 'excelled', 'maintained', 'perfected', 'refined',
        'strengthened', 'elevated', 'enhanced', 'improved',

        # Collaboration & Communication
        'aligned', 'bridged', 'collaborated', 'communicated', 'connected',
        'consulted', 'facilitated', 'fostered', 'influenced', 'instructed',
        'liaised', 'mentored', 'partnered', 'presented', 'promoted',
        'taught', 'united',

        # Problem-Solving & Impact
        'alleviated', 'conquered', 'eliminated', 'eradicated', 'mitigated',
        'overcome', 'prevented', 'resolved', 'salvaged', 'stabilized',
        'remedied',

        # Recognition & Authority Building
        'awarded', 'cited', 'commended', 'honored', 'inducted',
        'nominated', 'published', 'recognized', 'selected',

        # Additional High-Impact Verbs
        'catalyzed', 'clarified', 'consolidated', 'empowered', 'extracted',
        'galvanized', 'harvested', 'illuminated', 'incited', 'leveraged',
        'monetized', 'professionalized', 'revitalized', 'sharpened',
        'solidified', 'spurred', 'standardized', 'synchronized',
        'synthesized', 'tailored', 'unblocked', 'unified', 'ventured',
    }

    # Generic CV filler phrases to avoid in professional summaries
    _GENERIC_FILLER_PHRASES = {
        'seek a position',
        'looking for a role',
        'looking for an opportunity',
        'eager to contribute',
        'team member',
        'highly motivated',
        'hard working',
        'responsible individual',
        'detail-oriented',
        'self-starter',
        'results-driven',
        'think outside the box',
        'synergy',
        'passionate about',
        'dynamic professional',
        'dynamic team',
        'seasoned professional',
        'progressive company',
        'collaborative environment',
        'track record of success',
        'diverse portfolio',
        'skilled professional',
        'dedicated professional',
    }

    @staticmethod
    def check_strong_action_verb(text: str) -> Dict[str, Any]:
        """Check if bullet point opens with a strong action verb.

        Args:
            text: Bullet or paragraph text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'strong_action_verb',
                'severity': 'warn' if fail,
                'details': error message if fail.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'strong_action_verb', 'severity': 'info', 'details': ''}

        # Extract first word
        words = re.findall(r'\b[a-zA-Z]+\b', text)
        if not words:
            return {'pass': True, 'flag_type': 'strong_action_verb', 'severity': 'info', 'details': ''}

        first_word = words[0].lower()

        # Check if in approved list
        if first_word in LLMClient._STRONG_ACTION_VERBS:
            return {'pass': True, 'flag_type': 'strong_action_verb', 'severity': 'info', 'details': ''}

        return {
            'pass': False,
            'flag_type': 'strong_action_verb',
            'severity': 'warn',
            'details': f"Bullet opens with '{first_word}' (not in strong action verb list). Consider: Developed, Designed, Led, Built, Deployed, etc."
        }

    @staticmethod
    def check_passive_voice(text: str) -> Dict[str, Any]:
        """Check for passive voice constructions.

        Args:
            text: Bullet or paragraph text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'passive_voice',
                'severity': 'warn' if fail,
                'details': error message if fail.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'passive_voice', 'severity': 'info', 'details': ''}

        # Patterns for passive voice
        passive_patterns = [
            r'\bwas\s+(?:V|[a-z]*ed)\b',      # was X, was designed
            r'\bwere\s+(?:V|[a-z]*ed)\b',     # were X
            r'\bresponsible\s+for\b',          # responsible for
            r'\bhelped\s+(?:to\s+)?',          # helped to
            r'\bwas\s+involved\s+in\b',        # was involved in
            r'\bassisted\s+(?:with|with)\b',  # assisted with
            r'\bwas\s+tasked\s+with\b',        # was tasked with
        ]

        for pattern in passive_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return {
                    'pass': False,
                    'flag_type': 'passive_voice',
                    'severity': 'warn',
                    'details': f"Detected passive voice or hedging language. Rewrite in active voice focusing on what YOU did."
                }

        return {'pass': True, 'flag_type': 'passive_voice', 'severity': 'info', 'details': ''}

    @staticmethod
    def check_word_count(text: str, max_words: int = 30) -> Dict[str, Any]:
        """Check if bullet exceeds word limit.

        Args:
            text: Bullet text.
            max_words: Maximum allowed words (default 30 per US-P4).

        Returns:
            {
                'pass': bool,
                'flag_type': 'word_count',
                'severity': 'warn' if fail,
                'details': error message if fail.
            }
        """
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'word_count', 'severity': 'info', 'details': ''}

        word_count = len(text.split())
        if word_count <= max_words:
            return {'pass': True, 'flag_type': 'word_count', 'severity': 'info', 'details': ''}

        return {
            'pass': False,
            'flag_type': 'word_count',
            'severity': 'warn',
            'details': f"Bullet has {word_count} words (limit: {max_words}). Compress for readability."
        }

    @staticmethod
    def check_has_result_clause(text: str) -> Dict[str, Any]:
        """Check if bullet includes a result/outcome clause.

        Args:
            text: Bullet text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'has_result',
                'severity': 'warn' if fail,
                'details': error message if fail.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'has_result', 'severity': 'info', 'details': ''}

        # Heuristics for result clause: metric, number, outcome word
        result_indicators = [
            r'\d+\s*(?:%|K|M|B|ms|sec|users?|customers?|minutes?|days?|months?|years?)?',  # Number/metric
            r'\b(?:reduced|increased|improved|enhanced|accelerated|achieved|delivered|enabled|generated|maximized|minimized|optimized)\b',
            r'\b(?:resulted in|led to|contributed to|drove|impacted|affected)\b',
        ]

        for pattern in result_indicators:
            if re.search(pattern, text, re.IGNORECASE):
                return {'pass': True, 'flag_type': 'has_result', 'severity': 'info', 'details': ''}

        return {
            'pass': False,
            'flag_type': 'has_result',
            'severity': 'info',
            'details': f"No quantified result or outcome detected. Add metrics or impact (e.g., 'improved by 40%', 'enabled 3M users')."
        }

    @staticmethod
    def check_hedging_language(text: str) -> Dict[str, Any]:
        """Check for hedging language that undermines authority.

        Args:
            text: Bullet text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'hedging',
                'severity': 'warn' if fail,
                'details': error message if fail.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'hedging', 'severity': 'info', 'details': ''}

        hedging_patterns = [
            r'\bhelped\s+(?:to\s+)?',          # helped to
            r'\bassisted\s+with\b',             # assisted with
            r'\bwas\s+involved\s+in\b',         # was involved in
            r'\bcontributed\s+to\b',            # contributed to (mild)
            r'\bparticipated\s+in\b',           # participated in
            r'\bsupported\s+(?:the\s+)?',       # supported the...
            r'\bworked\s+(?:on|with)\b',        # worked on/with
            r'\bseemed\s+',                     # seemed to
            r'\bapproached\b',                  # approached (weak)
            r'\b(?:may|might|could|some)\s+',  # may, might, could
        ]

        for pattern in hedging_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return {
                    'pass': False,
                    'flag_type': 'hedging',
                    'severity': 'warn',
                    'details': f"Detected hedging language. Replace with assertive framing: 'Led', 'Drove', 'Delivered' instead of 'helped', 'contributed', 'worked on'."
                }

        return {'pass': True, 'flag_type': 'hedging', 'severity': 'info', 'details': ''}

    @staticmethod
    def check_named_institution_position(text: str, max_position: int = 15) -> Dict[str, Any]:
        """Check if branded org names appear within first N words.

        Args:
            text: Bullet text.
            max_position: Maximum position (word count) for named orgs (default 15 per US-P2).

        Returns:
            {
                'pass': bool,
                'flag_type': 'institution_placement',
                'severity': 'info' if warning,
                'details': message or empty string.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'institution_placement', 'severity': 'info', 'details': ''}

        # Common FAANG and recognizable branded orgs
        branded_orgs = {
            'google', 'amazon', 'apple', 'microsoft', 'facebook', 'meta',
            'netflix', 'spotify', 'tesla', 'airbnb', 'uber', 'lyft',
            'adobe', 'slack', 'github', 'gitlab', 'salesforce', 'oracle',
            'ibm', 'intel', 'nvidia', 'amd', 'qualcomm',
            'pfizer', 'moderna', 'jnj', 'johnson', 'merck',
            'genentech', 'amgen', 'celgene', 'broadcom', 'qualcomm',
            'mit', 'stanford', 'harvard', 'berkeley', 'caltech',
            'yale', 'princeton', 'columbia', 'upenn', 'cmu',
            'nature', 'science', 'cell', 'nature genetics', 'pnas',
            'acl', 'emnlp', 'neurips', 'icml', 'iccv',
        }

        # Find first position of any branded org name
        words = text.split()
        for i, word in enumerate(words[:max_position * 2]):  # scan 2x window
            if any(org in word.lower() for org in branded_orgs):
                if i < max_position:
                    return {'pass': True, 'flag_type': 'institution_placement', 'severity': 'info', 'details': ''}

        # Check if there's a branded org name anywhere
        text_lower = text.lower()
        for org in branded_orgs:
            if org in text_lower:
                # Found, but not in first N words
                word_pos = len(text_lower[:text_lower.find(org)].split())
                if word_pos >= max_position:
                    return {
                        'pass': False,
                        'flag_type': 'institution_placement',
                        'severity': 'info',
                        'details': f"Brand/institution name found at word {word_pos+1}. Front-load to first {max_position} words for maximum impact."
                    }

        return {'pass': True, 'flag_type': 'institution_placement', 'severity': 'info', 'details': ''}

    @staticmethod
    def check_car_structure(text: str) -> Dict[str, Any]:
        """Check for Challenge-Action-Result (CAR) structure.

        CAR structure is more persuasive than plain Action-Result.
        This check is informational; we flag bullets that lack a challenge/context.

        Args:
            text: Bullet or paragraph text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'car_structure',
                'severity': 'info' (never 'warn'),
                'details': message or empty string.
            }
        """
        import re
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'car_structure', 'severity': 'info', 'details': ''}

        # Heuristics for context (Challenge):
        context_indicators = [
            r'\b(?:faced|encountered|overcome|struggled|challenged|tasked|required|needed)\b',
            r'\b(?:due to|because of|in response to|when|after|before)\b',
            r'\b(?:reduce|optimize|improve|modernize|migrate|scale|fix|resolve|address)\b',
        ]

        # Check if bullet has context + action + result pattern
        has_context = any(re.search(p, text, re.IGNORECASE) for p in context_indicators)
        has_result = bool(re.search(r'\d+\%?|(?:reduced|increased|improved|delivered|achieved|enabled|drove)', text, re.IGNORECASE))

        if has_context and has_result:
            return {'pass': True, 'flag_type': 'car_structure', 'severity': 'info', 'details': 'Good: CAR (Challenge-Action-Result) structure detected.'}
        elif has_result:
            return {'pass': True, 'flag_type': 'car_structure', 'severity': 'info', 'details': ''}
        else:
            return {
                'pass': False,
                'flag_type': 'car_structure',
                'severity': 'info',
                'details': 'Consider adding Challenge-Action-Result (CAR) structure: "Faced [problem], [Action], resulting in [Result]".'
            }

    @staticmethod
    def check_summary_generic_phrases(text: str) -> Dict[str, Any]:
        """Check professional summary for generic filler phrases.

        Args:
            text: Professional summary text.

        Returns:
            {
                'pass': bool,
                'flag_type': 'generic_summary',
                'severity': 'warn' if multiple found,
                'details': error message listing flagged phrases.
            }
        """
        if not text or not text.strip():
            return {'pass': True, 'flag_type': 'generic_summary', 'severity': 'info', 'details': ''}

        text_lower = text.lower()
        found_phrases = [
            phrase for phrase in LLMClient._GENERIC_FILLER_PHRASES
            if phrase in text_lower
        ]

        if not found_phrases:
            return {'pass': True, 'flag_type': 'generic_summary', 'severity': 'info', 'details': ''}

        severity = 'warn' if len(found_phrases) > 2 else 'info'
        return {
            'pass': len(found_phrases) <= 1,  # Allow 1 filler phrase max
            'flag_type': 'generic_summary',
            'severity': severity,
            'details': f"Found {len(found_phrases)} generic filler phrase(s): {', '.join(found_phrases)}. Rewrite with specific value claims."
        }

    def _parse_json_response(self, response: str) -> Any:
        """Parse a JSON value from an LLM response, tolerating markdown fences.

        Tries direct ``json.loads``, then extracts the payload from a
        triple-backtick ``json`` or bare triple-backtick code block.
        Raises ``ValueError`` when no extractable JSON is found.
        """
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass
        if '```json' in response:
            return json.loads(response.split('```json')[1].split('```')[0].strip())
        if '```' in response:
            block = response.split('```')[1].split('```')[0].strip()
            if block.startswith('json\n'):
                block = block[5:]
            return json.loads(block)
        raise ValueError(
            f"Cannot extract JSON from LLM response: {response[:200]!r}"
        )

    def rank_publications_for_job(
        self,
        publications: List[Dict],
        job_analysis: Dict,
        candidate_name: str = '',
        max_results: int = 10,
    ) -> List[Dict]:
        """Rank publications by relevance to the target job using the LLM.

        Args:
            publications: List of parsed publication dicts from bibtex_parser
                          (each has keys: key, type, title, year, authors, …).
            job_analysis: Output of analyze_job_description (ats_keywords,
                          required_skills, domain, role_level, …).
            candidate_name: Candidate's full name for first-author detection.
            max_results:  Maximum number of ranked publications to return.

        Returns:
            List of dicts, most-relevant first::

                {
                  "cite_key":         str,
                  "title":            str,
                  "venue":            str,
                  "year":             str|int,
                  "is_first_author":  bool,
                  "relevance_score":  int,   # 1–10
                  "rationale":        str,
                  "authority_signals": [str],
                  "venue_warning":    str,   # non-empty if venue missing
                  "formatted_citation": str,
                }

            Returns an empty list on failure — never raises.
        """
        if not publications:
            return []

        # Build a compact publication list for the prompt.
        pub_lines = []
        for i, pub in enumerate(publications[:60]):  # cap at 60 to stay in context
            first_author = ''
            if candidate_name and pub.get('authors'):
                last_name = candidate_name.split()[-1] if candidate_name else ''
                first_author = ' [FIRST_AUTHOR]' if last_name and last_name.lower() in pub['authors'].lower() and pub['authors'].lower().startswith(last_name.lower()) else ''
            venue = pub.get('journal') or pub.get('booktitle') or pub.get('publisher') or ''
            venue_str = f" | {venue}" if venue else ' | [no venue]'
            pub_lines.append(
                f"{i+1}. key={pub.get('key', '')} ({pub.get('year', '?')})"
                f"{first_author}{venue_str}\n   {pub.get('title', '')}"
            )

        prompt = f"""You are selecting publications for a CV tailored to this job.

Job Analysis:
- Domain: {job_analysis.get('domain', 'N/A')}
- Role: {job_analysis.get('title', 'N/A')}
- Required skills: {', '.join((job_analysis.get('required_skills') or [])[:15])}
- ATS keywords: {', '.join((job_analysis.get('ats_keywords') or [])[:15])}

Publications ({len(pub_lines)} total):
{chr(10).join(pub_lines)}

Select and rank up to {max_results} publications most relevant for this role.
Return ONLY valid JSON — an array of objects. No extra text.

Schema:
[
  {{
    "cite_key": "...",
    "relevance_score": 1-10,
    "confidence": "High|Medium|Low",
    "rationale": "1-2 sentence explanation"
  }}
]
"""
        try:
            response = self.chat(
                messages=[
                    {"role": "system", "content": "You select relevant academic publications for a CV. Respond with strict JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=800,
            )
            ranked_raw = self._parse_json_response(response)
            if not isinstance(ranked_raw, list):
                return []
        except Exception as exc:
            import warnings
            warnings.warn(f"rank_publications_for_job: LLM call failed ({exc}); returning empty list")
            return []

        # Build the output list, merging LLM ranking with source publication data.
        pub_by_key = {p.get('key', ''): p for p in publications}
        results = []
        for item in ranked_raw:
            if not isinstance(item, dict):
                continue
            cite_key = str(item.get('cite_key', '')).strip()
            pub = pub_by_key.get(cite_key)
            if not pub:
                continue
            # Authority signals
            authority_signals = []
            if candidate_name:
                last_name = candidate_name.split()[-1]
                authors_str = pub.get('authors', '')
                if last_name and last_name.lower() in authors_str.lower() and authors_str.lower().startswith(last_name.lower()):
                    authority_signals.append('first_author')
            if pub.get('journal'):
                authority_signals.append(f"journal: {pub['journal']}")
            elif pub.get('booktitle'):
                authority_signals.append(f"conference: {pub['booktitle']}")
            # Venue warning
            has_venue = bool(pub.get('journal') or pub.get('booktitle'))
            venue_warning = '' if has_venue else 'No journal or conference name found in BibTeX entry'
            # Formatted citation (use bibtex_parser if available, else basic)
            try:
                from utils.bibtex_parser import format_publication
                formatted_citation = format_publication(pub, style='apa')
            except Exception:
                authors = pub.get('authors', '')
                year = pub.get('year', '')
                title = pub.get('title', '')
                venue = pub.get('journal') or pub.get('booktitle') or ''
                formatted_citation = f"{authors} ({year}). {title}. {venue}".strip('. ')

            results.append({
                'cite_key':          cite_key,
                'title':             pub.get('title', ''),
                'venue':             pub.get('journal') or pub.get('booktitle') or '',
                'year':              pub.get('year', ''),
                'is_first_author':   'first_author' in authority_signals,
                'relevance_score':   min(10, max(1, int(item.get('relevance_score', 5)))),
                'confidence':        str(item.get('confidence', '')).strip() or 'Medium',
                'rationale':         str(item.get('rationale', '')).strip()[:300],
                'authority_signals': authority_signals,
                'venue_warning':     venue_warning,
                'formatted_citation': formatted_citation,
            })

        # Sort by relevance_score descending, then by year descending.
        results.sort(key=lambda x: (-x['relevance_score'], -int(str(x['year']).strip() or '0')))
        return results[:max_results]

    def _propose_rewrites_via_chat(
        self,
        content: Dict,
        job_analysis: Dict,
        conversation_history: List[Dict] = None,
        user_preferences: Dict = None,
    ) -> List[Dict]:
        """Shared :meth:`propose_rewrites` logic for chat-capable providers.

        Builds a structured prompt from *content* and *job_analysis*, sends it
        via ``self.chat()``, parses the JSON response, and filters out any
        proposals that fail :meth:`apply_rewrite_constraints`.

        Provider subclasses delegate to this method from their own
        :meth:`propose_rewrites` override, satisfying the ABC contract while
        keeping the prompt logic in one place.
        """
        import warnings

        # ── Compact serialisation of CV sections for the prompt ──────────────
        summary     = content.get('summary') or content.get('professional_summary', '')
        experiences = content.get('experiences') or content.get('experience', [])

        bullets_lines: List[str] = []
        for exp in experiences[:10]:
            exp_id = exp.get('id', '')
            for i, ach in enumerate(exp.get('achievements', [])[:5]):
                text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                if text.strip():
                    bullets_lines.append(f"  {exp_id}.achievements[{i}]: {text}")

        skills_raw = content.get('skills', [])
        if isinstance(skills_raw, dict):
            skill_names: List[str] = []
            for cat_data in skills_raw.values():
                cat_skills = (
                    cat_data.get('skills', []) if isinstance(cat_data, dict)
                    else cat_data if isinstance(cat_data, list) else []
                )
                skill_names.extend(str(s) for s in cat_skills)
        else:
            skill_names = [str(s) for s in (skills_raw or [])]

        keywords = list(dict.fromkeys(
            job_analysis.get('ats_keywords', []) +
            job_analysis.get('required_skills', [])
        ))

        bullets_section = '\n'.join(bullets_lines) or '(none)'
        skills_section  = ', '.join(skill_names[:30]) or '(none)'
        keywords_str    = ', '.join(keywords[:25]) or '(none)'

        prefs_section = ""
        if user_preferences:
            lines = "\n".join(f"  - {k}: {v}" for k, v in user_preferences.items())
            prefs_section = f"CANDIDATE PREFERENCES (respect these when prioritising rewrites):\n{lines}\n\n"

        history_section = ""
        if conversation_history:
            history_section = "CONVERSATION HISTORY (for additional context):\n" + "-" * 60 + "\n"
            for msg in conversation_history:
                role = msg.get('role', 'unknown').capitalize()
                content_text = msg.get('content', '')[:800]
                history_section += f"{role}: {content_text}\n\n"
            history_section += "-" * 60 + "\n\n"

        prompt = (
            "You are a CV optimization specialist. Propose targeted text rewrites "
            "so the CV uses terminology from the job description.\n\n"
            f"{prefs_section}"
            f"{history_section}"
            "CONSTRAINTS — every proposal MUST:\n"
            '1. Preserve all numbers, metrics, and percentages '
            '(e.g. "40%", "12 engineers", "$2M")\n'
            '2. Preserve all dates and years (e.g. "2021", "Q3 2022")\n'
            "3. Preserve all company names and proper nouns\n"
            "4. Only substitute terminology — do NOT fabricate experience, "
            "achievements, or roles\n"
            "5. Keep rewrites concise and professional\n\n"
            f"JOB KEYWORDS TO INTRODUCE: {keywords_str}\n\n"
            f"PROFESSIONAL SUMMARY:\n{summary or '(none)'}\n\n"
            f"EXPERIENCE BULLETS (id.achievements[index]: text):\n{bullets_section}\n\n"
            f"SKILLS: {skills_section}\n\n"
            'Return a JSON array of rewrite proposals.  Each item must include '
            'ALL applicable fields:\n'
            '{\n'
            '  "id":                  "<unique label, e.g. \'summary\', '
            '\'bullet_exp001_0\', \'skill_3\'>",\n'
            '  "type":                "summary" | "bullet" | "skill_rename" | "skill_add",\n'
            '  "location":            "<path, e.g. \'summary\', '
            '\'exp_001.achievements[2]\', \'skills.core[1]\'>",\n'
            '  "original":            "<exact original text>",\n'
            '  "proposed":            "<proposed replacement text>",\n'
            '  "keywords_introduced": ["<kw1>", "<kw2>"],\n'
            '  "evidence":            "<comma-separated exp IDs, skill_add only>",\n'
            '  "evidence_strength":   "strong" | "weak",\n'
            '  "rationale":           "<one sentence explaining the ATS improvement>"\n'
            '}\n\n'
            'Only propose rewrites where keyword alignment genuinely improves ATS '
            'scoring.  Return [] if no meaningful changes are needed.\n'
            'Return ONLY the JSON array, with no surrounding prose or markdown '
            'code fences.'
        )

        messages = [
            {
                "role":    "system",
                "content": (
                    "You are an expert CV writer focused on ATS keyword optimisation. "
                    "Return only valid JSON — a bare array, no markdown fences."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        try:
            response = self.chat(messages, temperature=0.3, max_tokens=4096)
            raw = self._parse_json_response(response)
            if not isinstance(raw, list):
                raw = raw.get('rewrites') or raw.get('proposals') or []
            valid: List[Dict] = []
            for item in raw:
                if self.apply_rewrite_constraints(
                    item.get('original', ''), item.get('proposed', '')
                ):
                    valid.append(item)
                else:
                    warnings.warn(
                        f"propose_rewrites: constraint violation filtered "
                        f"(id={item.get('id')!r})"
                    )
            return valid
        except Exception as exc:
            warnings.warn(
                f"propose_rewrites: failed to produce proposals: {exc}"
            )
            return []


class OpenAIClient(LLMClient):
    """OpenAI GPT client."""
    
    def __init__(self, model: str = "gpt-4", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not found. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to OpenAI."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        self.last_usage = response.usage
        return response.choices[0].message.content
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using GPT."""
        prompt = f"""Analyze this job description and extract:
1. Key requirements (must-have vs. nice-to-have)
2. Required skills and technologies
3. Domain focus (data science, biostatistics, ML engineering, etc.)
4. Role level (IC, senior IC, staff, principal, leadership)
5. Company culture indicators
6. Top 10 keywords for ATS optimization

Job Description:
{job_text}

Return as JSON with these fields:
- title: str
- company: str (if mentioned)
- domain: str
- role_level: str
- required_skills: List[str]
- preferred_skills: List[str]
- must_have_requirements: List[str]
- nice_to_have_requirements: List[str]
- culture_indicators: List[str]
- ats_keywords: List[str]
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at analyzing job descriptions for CV optimization."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.3)
        
        # Parse JSON response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise
    
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for customization with 3-part structure."""
        
        # Extract skills list from master_data
        skills_data = master_data.get('skills', [])
        all_skills = []
        if isinstance(skills_data, dict):
            # If skills is a dict with categories, extract skills from each category
            for category_data in skills_data.values():
                if isinstance(category_data, dict) and 'skills' in category_data:
                    # Each category has {'category': name, 'skills': [list of skills]}
                    category_skills = category_data.get('skills', [])
                    if isinstance(category_skills, list):
                        all_skills.extend(category_skills)
                elif isinstance(category_data, list):
                    # Handle legacy format where category_data is directly a list
                    all_skills.extend(category_data)
        elif isinstance(skills_data, list):
            all_skills = skills_data
        
        # Build user preferences context
        user_context = ""
        if user_preferences:
            user_context = "\n\n" + "="*80 + "\n"
            user_context += "🚨 CRITICAL USER INSTRUCTIONS - THESE OVERRIDE ALL OTHER CONSIDERATIONS:\n"
            user_context += "="*80 + "\n"
            for pref_type, pref_value in user_preferences.items():
                user_context += f"\n{pref_type.upper()}:\n{pref_value}\n"
            user_context += "\n" + "="*80 + "\n"
            user_context += "COMPLIANCE REQUIRED:\n"
            user_context += "- If user says 'omit' or 'exclude' specific companies/experiences by name, set recommendation to 'Omit'\n"
            user_context += "- If user says 'focus on' or 'emphasize' specific types of work, set those to 'Emphasize'\n"
            user_context += "- If user mentions specific achievements/projects to highlight, ensure related experiences are 'Emphasize' or 'Include'\n"
            user_context += "- Extract company names and keywords from user instructions and apply them literally\n"
            user_context += "="*80 + "\n\n"
        
        # Add conversation history if available
        conversation_context = ""
        if conversation_history:
            conversation_context = "\n\nRecent Conversation History:\n"
            conversation_context += "-"*80 + "\n"
            for msg in conversation_history:
                role = msg.get('role', 'unknown').capitalize()
                content = msg.get('content', '')[:800]
                conversation_context += f"{role}: {content}\n\n"
            conversation_context += "-"*80 + "\n"
            conversation_context += "Review this conversation for additional user preferences and instructions.\n\n"
        
        prompt = f"""Based on this job analysis and candidate's master CV data, provide detailed recommendations.{user_context}{conversation_context}

Job Analysis:
{json.dumps(job_analysis, indent=2)}

Candidate Data Summary:
- {len(master_data.get('experience', []))} experiences
- {len(all_skills)} skills
- {len(master_data.get('selected_achievements', []))} key achievements

STEP 1: Before making recommendations, extract key instructions from user preferences above:
- List any company names, organizations, or experience IDs user wants to OMIT/EXCLUDE
- List any types of work, projects, or skills user wants to EMPHASIZE/FOCUS ON
- List any specific achievements or awards user wants to HIGHLIGHT

STEP 2: Review all experiences and match against user instructions:

Available Experiences:"""
            
        # Add detailed experience list with company names
        for exp in master_data.get('experience', []):
            exp_id = exp.get('id', '')
            title = exp.get('title', '')
            company = exp.get('company', '')
            prompt += f"\n- {exp_id}: {title} at {company}"

        prompt += f"""

Available Key Achievements:"""

        for ach in master_data.get('selected_achievements', []):
            ach_id = ach.get('id', '')
            title = ach.get('title', '')
            relevant_for = ', '.join(ach.get('relevant_for', []))
            prompt += f"\n- {ach_id}: {title} (relevant for: {relevant_for})"

        prompt += f"""

STEP 3: For EACH experience above, provide THREE independent pieces of information:

1. RECOMMENDATION LEVEL (choose exactly one - based on JOB RELEVANCE):
   - "Emphasize": Highly relevant - feature prominently with full details
   - "Include": Relevant - include with standard treatment
   - "De-emphasize": Marginally relevant - brief mention only
   - "Omit": Not relevant - exclude from this CV

2. CONFIDENCE LEVEL (5-point scale - based on EVIDENCE STRENGTH):
   - "Very High": Overwhelming evidence from CV that supports this recommendation
   - "High": Strong evidence clearly supports this recommendation
   - "Medium": Moderate evidence, some assumptions made
   - "Low": Limited evidence, significant assumptions
   - "Very Low": Very limited evidence, highly speculative

   THIS IS ABOUT HOW CERTAIN YOU ARE ABOUT YOUR RECOMMENDATION, NOT RELEVANCE.

3. REASONING: 2-3 sentences explaining:
   - Why you made this recommendation (job match, relevance, etc.)
   - What evidence supports your confidence level
   - Any assumptions you made

IMPORTANT: These are INDEPENDENT dimensions!
- You can have "Emphasize" with "Medium Confidence" (very relevant but uncertain if CV truly demonstrates it)
- You can have "De-emphasize" with "Very High Confidence" (clearly not relevant, very certain about this)
- You can have "Include" with "High Confidence" (relevant and clearly demonstrated)

For SKILLS, provide the same 3-part structure for skills that are particularly relevant or irrelevant.
You don't need to provide recommendations for every single skill, but focus on:
- Skills that are highly relevant to the job (Emphasize/Include)
- Skills that might be misleading or irrelevant (De-emphasize/Omit)

Return as JSON with:
{{
  "experience_recommendations": [
    {{
      "id": "exp_001",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence": "Very High|High|Medium|Low|Very Low",
      "reasoning": "Detailed explanation of why this recommendation was made and the evidence supporting it"
    }},
    ...
  ],
  "skill_recommendations": [
    {{
      "skill": "Python",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence": "Very High|High|Medium|Low|Very Low",
      "reasoning": "Brief explanation of relevance"
    }},
    ...
  ],
  "recommended_skills": ["skill1", "skill2", ...],
  "achievement_recommendations": [
    {{
      "id": "sa_001",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence": "Very High|High|Medium|Low|Very Low",
      "reasoning": "Brief explanation of relevance to this role"
    }},
    ...
  ],
  "recommended_achievements": ["achievement_id1", ...],
  "summary_focus": "Brief description of what to emphasize in professional summary",
  "reasoning": "Overall strategy for this CV customization"
}}

Be thorough - provide recommendations for ALL {len(master_data.get('experience', []))} experiences and ALL {len(master_data.get('selected_achievements', []))} key achievements using their exact IDs."""
        
        messages = [
            {"role": "system", "content": "You are an expert at CV optimization. You provide structured recommendations with clear reasoning and confidence assessments."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.5)
        
        try:
            result = json.loads(response)
            # Add backwards compatibility - populate recommended_experiences from experience_recommendations
            if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                result['recommended_experiences'] = [
                    rec['id'] for rec in result['experience_recommendations']
                    if rec.get('recommendation') in ['Emphasize', 'Include']
                ]
            return result
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse LLM response as JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
                # Add backwards compatibility
                if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                    result['recommended_experiences'] = [
                        rec['id'] for rec in result['experience_recommendations']
                        if rec.get('recommendation') in ['Emphasize', 'Include']
                    ]
                return result
            elif "```" in response:
                # Try any code block
                json_str = response.split("```")[1].split("```")[0].strip()
                # Remove language identifier if present
                if json_str.startswith('json\n'):
                    json_str = json_str[5:]
                result = json.loads(json_str)
                # Add backwards compatibility
                if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                    result['recommended_experiences'] = [
                        rec['id'] for rec in result['experience_recommendations']
                        if rec.get('recommendation') in ['Emphasize', 'Include']
                    ]
                return result
            
            # Return a default response structure with new format
            print("Warning: Returning default recommendations")
            return {
                "experience_recommendations": [],
                "recommended_experiences": [],  # Keep for backwards compatibility
                "recommended_skills": [],
                "achievement_recommendations": [],
                "recommended_achievements": [],
                "summary_focus": "general",
                "reasoning": "Failed to parse LLM response"
            }
    
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity using embeddings."""
        # Use OpenAI embeddings for semantic similarity
        try:
            content_embedding = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=content
            ).data[0].embedding
            
            req_text = " ".join(requirements)
            req_embedding = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=req_text
            ).data[0].embedding
            
            # Cosine similarity
            import numpy as np
            similarity = np.dot(content_embedding, req_embedding) / (
                np.linalg.norm(content_embedding) * np.linalg.norm(req_embedding)
            )
            
            return float(similarity)
        except Exception:
            # Fallback to simple keyword matching
            return self._fallback_match(content, requirements)
    
    def _fallback_match(self, content: str, requirements: List[str]) -> float:
        """Simple keyword matching fallback."""
        content_lower = content.lower()
        matches = sum(1 for req in requirements if req.lower() in content_lower)
        return matches / len(requirements) if requirements else 0.0

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites via OpenAI chat. Delegates to shared implementation."""
        return self._propose_rewrites_via_chat(content, job_analysis, conversation_history, user_preferences)


class AnthropicClient(LLMClient):
    """Anthropic Claude client."""
    
    def __init__(self, model: str = "claude-3-opus-20240229", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable."
            )
        
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "Anthropic package not installed. Run: pip install anthropic"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to Claude."""
        # Extract system message if present
        system_msg = None
        user_messages = []
        
        for msg in messages:
            if msg['role'] == 'system':
                system_msg = msg['content']
            else:
                user_messages.append(msg)
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system_msg,
            messages=user_messages
        )
        self.last_usage = response.usage
        return response.content[0].text
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using Claude (similar to OpenAI implementation)."""
        # Implementation similar to OpenAI but using Claude's format
        # ... (similar logic)
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Optional[Dict] = None, conversation_history: Optional[List[Dict]] = None) -> Dict:
        """Get recommendations from Claude."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using Claude."""
        # Claude doesn't have native embeddings API, use prompting
        pass

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites via Anthropic Claude. Delegates to shared implementation."""
        return self._propose_rewrites_via_chat(content, job_analysis, conversation_history, user_preferences)


class GeminiClient(LLMClient):
    """Google Gemini client."""
    
    def __init__(self, model: str = "gemini-1.5-pro", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        try:
            from any_llm import completion as anyllm_completion
            self._anyllm_completion = anyllm_completion
        except ImportError:
            raise ImportError(
                "any-llm package not installed. Run: pip install any-llm-sdk[gemini]"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to Gemini."""
        response = self._anyllm_completion(
            provider="gemini",
            model=self.model,
            api_key=self.api_key,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self.last_usage = getattr(response, 'usage', None)

        # any-llm can return slightly different response envelopes depending on
        # provider/model version. Prefer OpenAI-style choices[0].message.content,
        # then fall back to common top-level text fields.
        content = None
        choices = getattr(response, "choices", None)
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            message = getattr(first_choice, "message", None)
            if message is not None:
                content = getattr(message, "content", None)

        if content is None:
            for attr in ("output_text", "text", "content"):
                value = getattr(response, attr, None)
                if value is not None:
                    content = value
                    break

        # Gemini-like envelope fallback:
        # response.candidates[0].content.parts -> [{'text': '...'}]
        if content is None:
            candidates = getattr(response, "candidates", None)
            if isinstance(candidates, list) and candidates:
                first_candidate = candidates[0]
                cand_content = getattr(first_candidate, "content", None)
                if cand_content is not None:
                    parts = getattr(cand_content, "parts", None)
                    if isinstance(parts, list):
                        text_parts = []
                        for part in parts:
                            if isinstance(part, dict):
                                text_parts.append(part.get("text", ""))
                            else:
                                text_parts.append(getattr(part, "text", "") or "")
                        joined = "".join(text_parts).strip()
                        if joined:
                            content = joined

        if content is None and isinstance(response, dict):
            for key in ("output_text", "text", "content"):
                if key in response and response[key] is not None:
                    content = response[key]
                    break

        if content is None and isinstance(response, dict):
            candidates = response.get("candidates")
            if isinstance(candidates, list) and candidates:
                cand_content = candidates[0].get("content", {}) if isinstance(candidates[0], dict) else {}
                parts = cand_content.get("parts", []) if isinstance(cand_content, dict) else []
                text_parts = [p.get("text", "") for p in parts if isinstance(p, dict)]
                joined = "".join(text_parts).strip()
                if joined:
                    content = joined

        if content is None:
            # Keep provider switching resilient for models that occasionally
            # return empty content on tiny probe prompts.
            return ""

        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_parts = [part.get("text", "") for part in content if isinstance(part, dict)]
            return "".join(text_parts).strip()
        return str(content)
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using Gemini."""
        prompt = f"""Analyze this job description and extract:
1. Key requirements (must-have vs. nice-to-have)
2. Required skills and technologies
3. Domain focus (data science, biostatistics, ML engineering, etc.)
4. Role level (IC, senior IC, staff, principal, leadership)
5. Company culture indicators
6. Top 10 keywords for ATS optimization

Job Description:
{job_text}

Return as JSON with these fields:
- title: str
- company: str (if mentioned)
- domain: str
- role_level: str
- required_skills: List[str]
- preferred_skills: List[str]
- must_have_requirements: List[str]
- nice_to_have_requirements: List[str]
- culture_indicators: List[str]
- ats_keywords: List[str]
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at analyzing job descriptions for CV optimization."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.3)
        
        # Parse JSON response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise
    
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for customization."""
        prompt = f"""Based on this job analysis and candidate's master CV data, recommend:
1. Which experiences to emphasize (list IDs and reasons)
2. Which skills to highlight
3. Which achievements to feature
4. Professional summary focus
5. Suggested content reordering

Job Analysis:
{json.dumps(job_analysis, indent=2)}

Candidate Data Summary:
- {len(master_data.get('experience', []))} experiences
- {len(master_data.get('skills', {}))} skill categories
- {len(master_data.get('selected_achievements', []))} key achievements

Available Experience IDs: {', '.join([exp.get('id', '') for exp in master_data.get('experience', [])])}

Return as JSON with:
- recommended_experiences: List[str] (use exact IDs from the list above, e.g., ["exp_001", "exp_005"])
- recommended_skills: List[str]
- achievement_recommendations: List[Dict] (each with id, recommendation, confidence, reasoning)
- recommended_achievements: List[str] (IDs)
- summary_focus: str
- reasoning: str
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at CV optimization and content selection."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.5)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse LLM response as JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "```" in response:
                # Try any code block
                json_str = response.split("```")[1].split("```")[0].strip()
                # Remove language identifier if present
                if json_str.startswith('json\n'):
                    json_str = json_str[5:]
                return json.loads(json_str)
            
            # Return a default response structure
            print("Warning: Returning default recommendations")
            return {
                "recommended_experiences": [],
                "recommended_skills": [],
                "achievement_recommendations": [],
                "recommended_achievements": [],
                "summary_focus": "general",
                "reasoning": "Failed to parse LLM response"
            }
    
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity using Gemini."""
        # Gemini doesn't have a native embeddings API yet, use prompting
        prompt = f"""Rate how well this content matches these requirements on a scale of 0.0 to 1.0.
Only return the numeric score.

Content: {content[:500]}

Requirements: {', '.join(requirements[:10])}

Score (0.0-1.0):"""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, temperature=0.1)
        
        try:
            return float(response.strip())
        except ValueError:
            return 0.5  # Default middle score

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites via Gemini. Delegates to shared implementation."""
        return self._propose_rewrites_via_chat(content, job_analysis, conversation_history, user_preferences)


class CopilotSdkClient(LLMClient):
    """GitHub Copilot client via the any-llm copilot_sdk provider."""

    def __init__(self, model: str = "gpt-4o", api_key: Optional[str] = None):
        self.model = model
        self.api_key = (
            api_key
            or os.getenv("COPILOT_GITHUB_TOKEN")
            or os.getenv("GITHUB_TOKEN")
            or os.getenv("GH_TOKEN")
        )
        # api_key may be None when using the logged-in GitHub CLI user — that is fine.

        try:
            from any_llm import completion as anyllm_completion
            self._anyllm_completion = anyllm_completion
        except ImportError:
            raise ImportError(
                "any-llm SDK with copilot_sdk extra not installed. "
                "Run: pip install any-llm-sdk[copilot_sdk]"
            )

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Send chat messages to GitHub Copilot via any-llm copilot_sdk provider."""
        kwargs: Dict[str, Any] = dict(
            provider="copilot_sdk",
            model=self.model,
            messages=messages,
            temperature=temperature,
        )
        if self.api_key is not None:
            kwargs["api_key"] = self.api_key
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens

        response = self._anyllm_completion(**kwargs)
        self.last_usage = getattr(response, 'usage', None)

        content = None
        choices = getattr(response, "choices", None)
        if isinstance(choices, list) and choices:
            message = getattr(choices[0], "message", None)
            if message is not None:
                content = getattr(message, "content", None)

        if content is None:
            for attr in ("output_text", "text", "content"):
                value = getattr(response, attr, None)
                if value is not None:
                    content = value
                    break

        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(part.get("text", "") for part in content if isinstance(part, dict)).strip()
        return str(content)

    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using GitHub Copilot."""
        prompt = f"""Analyze this job description and extract:
1. Key requirements (must-have vs. nice-to-have)
2. Required skills and technologies
3. Domain focus (data science, biostatistics, ML engineering, etc.)
4. Role level (IC, senior IC, staff, principal, leadership)
5. Company culture indicators
6. Top 10 keywords for ATS optimization

Job Description:
{job_text}

Return as JSON with these fields:
- title: str
- company: str (if mentioned)
- domain: str
- role_level: str
- required_skills: List[str]
- preferred_skills: List[str]
- must_have_requirements: List[str]
- nice_to_have_requirements: List[str]
- culture_indicators: List[str]
- ats_keywords: List[str]
"""

        messages = [
            {"role": "system", "content": "You are an expert at analyzing job descriptions for CV optimization."},
            {"role": "user",   "content": prompt},
        ]

        response = self.chat(messages, temperature=0.3)

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
                if json_str.startswith("json\n"):
                    json_str = json_str[5:]
                return json.loads(json_str)
            raise

    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None,
    ) -> Dict:
        """Get LLM recommendations for customization."""
        prompt = f"""Based on this job analysis and candidate's master CV data, recommend:
1. Which experiences to emphasize (list IDs and reasons)
2. Which skills to highlight
3. Which achievements to feature
4. Professional summary focus
5. Suggested content reordering

Job Analysis:
{json.dumps(job_analysis, indent=2)}

Candidate Data Summary:
- {len(master_data.get('experience', []))} experiences
- {len(master_data.get('skills', {}))} skill categories
- {len(master_data.get('selected_achievements', []))} key achievements

Available Experience IDs: {', '.join([exp.get('id', '') for exp in master_data.get('experience', [])])}

Return as JSON with:
- recommended_experiences: List[str] (use exact IDs from the list above, e.g., ["exp_001", "exp_005"])
- recommended_skills: List[str]
- recommended_achievements: List[str] (IDs)
- summary_focus: str
- reasoning: str
"""

        messages = [
            {"role": "system", "content": "You are an expert at CV optimization and content selection."},
            {"role": "user",   "content": prompt},
        ]

        response = self.chat(messages, temperature=0.5)

        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse LLM response as JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
                if json_str.startswith("json\n"):
                    json_str = json_str[5:]
                return json.loads(json_str)
            return {
                "recommended_experiences": [],
                "recommended_skills":      [],
                "recommended_achievements": [],
                "summary_focus":  "general",
                "reasoning":      "Failed to parse LLM response",
            }

    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Calculate semantic similarity via Copilot prompt scoring."""
        prompt = f"""Rate how well this content matches these requirements on a scale of 0.0 to 1.0.
Only return the numeric score.

Content: {content[:500]}

Requirements: {', '.join(requirements[:10])}

Score (0.0-1.0):"""

        response = self.chat([{"role": "user", "content": prompt}], temperature=0.1)
        try:
            return float(response.strip())
        except ValueError:
            return 0.5

    def propose_rewrites(
        self,
        content: Dict,
        job_analysis: Dict,
        conversation_history: List[Dict] = None,
        user_preferences: Dict = None,
    ) -> List[Dict]:
        """Propose rewrites via GitHub Copilot. Delegates to shared implementation."""
        return self._propose_rewrites_via_chat(content, job_analysis, conversation_history, user_preferences)


class LocalLLMClient(LLMClient):
    """Anthropic Claude client."""
    
    def __init__(self, model: str = "claude-3-opus-20240229", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable."
            )
        
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "Anthropic package not installed. Run: pip install anthropic"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send messages to Claude."""
        # Convert messages format
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
        user_messages = [m for m in messages if m["role"] != "system"]
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system_msg,
            messages=user_messages
        )
        self.last_usage = response.usage
        return response.content[0].text
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using Claude (similar to OpenAI implementation)."""
        # Implementation similar to OpenAI but using Claude's format
        # ... (similar logic)
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Optional[Dict] = None, conversation_history: Optional[List[Dict]] = None) -> Dict:
        """Get recommendations from Claude."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using Claude."""
        # Claude doesn't have native embeddings API, use prompting
        pass

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites not supported by this stub client."""
        return []


class LocalLLMClient(LLMClient):
    """Local LLM using transformers."""
    
    def __init__(self, model: str = "mistralai/Mistral-7B-Instruct-v0.2"):
        self.model_name = model
        
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch
            
            self.tokenizer = AutoTokenizer.from_pretrained(model)
            self.model = AutoModelForCausalLM.from_pretrained(
                model,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto"
            )
        except ImportError:
            raise ImportError(
                "Transformers not installed. Run: pip install transformers torch"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate response using local model."""
        # Format messages for instruction-following
        prompt = self._format_messages(messages)
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        prompt_tokens = inputs["input_ids"].shape[-1]
        
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_tokens or 512,
            temperature=temperature,
            do_sample=True
        )
        completion_tokens = outputs[0].shape[-1] - prompt_tokens
        self.last_usage = {
            "prompt_tokens":     prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens":      prompt_tokens + completion_tokens,
        }
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Extract just the response part
        response = response.split(prompt)[-1].strip()
        
        return response
    
    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        """Format messages for instruction model."""
        formatted = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                formatted.append(f"System: {content}")
            elif role == "user":
                formatted.append(f"User: {content}")
            elif role == "assistant":
                formatted.append(f"Assistant: {content}")
        formatted.append("Assistant: ")
        return "\n\n".join(formatted)
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using local model."""
        # Similar to OpenAI but may need simpler prompts
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Optional[Dict] = None, conversation_history: Optional[List[Dict]] = None) -> Dict:
        """Get recommendations from local model."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using local embeddings."""
        # Use sentence-transformers for embeddings
        try:
            from sentence_transformers import SentenceTransformer, util
            
            if not hasattr(self, 'embed_model'):
                self.embed_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            content_emb = self.embed_model.encode(content, convert_to_tensor=True)
            req_emb = self.embed_model.encode(" ".join(requirements), convert_to_tensor=True)
            
            similarity = util.cos_sim(content_emb, req_emb)
            return float(similarity[0][0])
        except ImportError:
            return self._fallback_match(content, requirements)
    
    def _fallback_match(self, content: str, requirements: List[str]) -> float:
        """Simple keyword matching fallback."""
        content_lower = content.lower()
        matches = sum(1 for req in requirements if req.lower() in content_lower)
        return matches / len(requirements) if requirements else 0.0

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites not supported by this local stub client."""
        return []


class GroqClient(OpenAIClient):
    """Groq client - uses OpenAI-compatible API for fast inference."""
    
    def __init__(self, model: str = "llama-3.3-70b-versatile", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Groq API key not found. Set GROQ_API_KEY environment variable or "
                "pass api_key parameter. Get a free key from: https://console.groq.com/"
            )
        
        try:
            from openai import OpenAI
            # Use Groq's API endpoint (OpenAI-compatible)
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )


class GitHubModelsClient(OpenAIClient):
    """GitHub Models client - uses OpenAI-compatible API with GitHub token."""

    # Short name → publisher/model ID required by models.inference.ai.azure.com
    MODEL_ALIASES = {
        "claude-sonnet-4-6":   "anthropic/claude-sonnet-4.6",
        "claude-3-7-sonnet":   "anthropic/claude-3-7-sonnet",
        "claude-3-5-sonnet":   "anthropic/claude-3-5-sonnet",
        "claude-3.5-sonnet":   "anthropic/claude-3-5-sonnet",  # dot-form alias
        "claude-3-haiku":      "anthropic/claude-3-haiku",
        "claude-3-opus":       "anthropic/claude-3-opus",
        "gpt-4o":              "openai/gpt-4o",
        "gpt-4o-mini":         "openai/gpt-4o-mini",
        "gpt-4-turbo-preview": "openai/gpt-4-turbo-preview",
        "gpt-3.5-turbo":       "openai/gpt-3.5-turbo",
        "o1-preview":          "openai/o1-preview",
        "o1-mini":             "openai/o1-mini",
    }

    def __init__(self, model: str = "gpt-4o", api_key: Optional[str] = None):
        # Expand short alias → full publisher/model ID required by the endpoint
        resolved_model = self.MODEL_ALIASES.get(model, model)
        self.model = _normalize_github_model_id(resolved_model)
        self.api_key = api_key or os.getenv("GITHUB_MODELS_TOKEN")
        
        if not self.api_key:
            raise ValueError(
                "GitHub Models token not found. Set GITHUB_MODELS_TOKEN environment variable or "
                "pass api_key parameter. Get a token from: https://github.com/settings/tokens"
            )
        
        try:
            from openai import OpenAI
            # Use GitHub's API endpoint
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://models.inference.ai.azure.com"
            )
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )


class CopilotClient(OpenAIClient):
    """GitHub Models client using GITHUB_MODELS_TOKEN PAT.

    Uses the Azure-hosted GitHub Models inference endpoint which accepts
    standard GitHub PATs and supports Claude, GPT-4o, and other models.
    Model IDs use the 'publisher/name' format required by this endpoint.
    """

    # Map short names → full GitHub Models publisher/model IDs
    MODEL_ALIASES = {
        "claude-sonnet-4-6":   "anthropic/claude-sonnet-4.6",
        "claude-3-7-sonnet":   "anthropic/claude-3-7-sonnet",
        "claude-3-5-sonnet":   "anthropic/claude-3-5-sonnet",
        "claude-3.5-sonnet":   "anthropic/claude-3-5-sonnet",  # dot-form alias
        "claude-3-haiku":      "anthropic/claude-3-haiku",
        "claude-3-opus":       "anthropic/claude-3-opus",
        "gpt-4o":              "openai/gpt-4o",
        "gpt-4o-mini":         "openai/gpt-4o-mini",
    }

    def __init__(self, model: str = "anthropic/claude-sonnet-4.6", api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GITHUB_MODELS_TOKEN") or os.getenv("GITHUB_TOKEN")

        if not self.api_key:
            raise ValueError(
                "GitHub Models token not found. Set GITHUB_MODELS_TOKEN environment variable. "
                "Create a PAT at https://github.com/settings/tokens"
            )

        # Expand short alias → full publisher/model ID
        resolved_model = self.MODEL_ALIASES.get(model, model)
        self.model = _normalize_github_model_id(resolved_model)

        try:
            from openai import OpenAI
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://models.inference.ai.azure.com"
            )
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )


class CopilotOAuthClient(LLMClient):
    """
    GitHub Copilot API client using Device-Flow OAuth.

    Targets https://api.githubcopilot.com — the same endpoint used by VS Code.
    Tokens are obtained via GitHub Device Flow (no PAT needed) and cached on
    disk.  The Copilot token auto-refreshes when it expires (~30 min TTL).

    Authentication must be completed before making API calls; call
    start_device_flow() / complete_device_flow() via the web UI first.
    """

    # Models known to work on api.githubcopilot.com
    SUPPORTED_MODELS = [
        "gpt-4o",
        "gpt-4o-mini",
        "claude-3.5-sonnet",
        "claude-3-7-sonnet",
        "o1-preview",
        "o1-mini",
    ]

    def __init__(
        self,
        model: str = "gpt-4o",
        auth_manager=None,
    ):
        self.model = model
        # Import here to keep top-level imports clean
        from utils.copilot_auth import CopilotAuthManager
        self._auth = auth_manager or CopilotAuthManager()

    # ── Internal HTTP helper ──────────────────────────────────────────────────

    def _post(self, payload: dict) -> dict:
        """POST to Copilot chat completions; refreshes token automatically."""
        import requests as _req
        token = self._auth.get_copilot_token()
        resp = _req.post(
            "https://api.githubcopilot.com/chat/completions",
            json=payload,
            headers={
                "Authorization":       f"Bearer {token}",
                "Content-Type":        "application/json",
                "Accept":              "application/json",
                "editor-version":      "vscode/1.85.0",
                "editor-plugin-version": "copilot/1.138.0",
                "openai-intent":       "conversation-panel",
                "copilot-integration-id": "vscode-chat",
            },
            timeout=120,
        )
        if resp.status_code == 401:
            # Token may have expired mid-flight — force refresh and retry once
            self._auth._cache.pop("copilot_token", None)
            self._auth._cache.pop("copilot_expires_at", None)
            token = self._auth.get_copilot_token()
            resp = _req.post(
                "https://api.githubcopilot.com/chat/completions",
                json=payload,
                headers={
                    "Authorization":       f"Bearer {token}",
                    "Content-Type":        "application/json",
                    "Accept":              "application/json",
                    "editor-version":      "vscode/1.85.0",
                    "editor-plugin-version": "copilot/1.138.0",
                    "openai-intent":       "conversation-panel",
                    "copilot-integration-id": "vscode-chat",
                },
                timeout=120,
            )
        resp.raise_for_status()
        return resp.json()

    # ── LLMClient interface ───────────────────────────────────────────────────

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        payload: dict = {
            "model":       self.model,
            "messages":    messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        data = self._post(payload)
        self.last_usage = data.get("usage")
        return data["choices"][0]["message"]["content"]

    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Delegate to OpenAIClient logic (same prompt format)."""
        from utils.llm_client import OpenAIClient as _OAI
        dummy = object.__new__(_OAI)
        dummy.model = self.model
        dummy.client = None   # not used — we override chat()
        # Bind our chat method into the dummy so prompts work unchanged
        import types
        dummy.chat = types.MethodType(lambda self_, msgs, **kw: self.chat(msgs, **kw), dummy)
        return _OAI.analyze_job_description(dummy, job_text, master_data)

    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None,
    ) -> Dict:
        from utils.llm_client import OpenAIClient as _OAI
        import types
        dummy = object.__new__(_OAI)
        dummy.model = self.model
        dummy.chat = types.MethodType(lambda self_, msgs, **kw: self.chat(msgs, **kw), dummy)
        return _OAI.recommend_customizations(
            dummy, job_analysis, master_data, user_preferences, conversation_history
        )

    def semantic_match(self, content: str, requirements: List[str]) -> float:
        from utils.llm_client import OpenAIClient as _OAI
        import types
        dummy = object.__new__(_OAI)
        dummy.model = self.model
        dummy.chat = types.MethodType(lambda self_, msgs, **kw: self.chat(msgs, **kw), dummy)
        return _OAI.semantic_match(dummy, content, requirements)

    def propose_rewrites(self, content: Dict, job_analysis: Dict, conversation_history: List[Dict] = None, user_preferences: Dict = None) -> List[Dict]:
        """Propose rewrites via Copilot OAuth. Delegates to shared implementation."""
        return self._propose_rewrites_via_chat(content, job_analysis, conversation_history, user_preferences)


# Available models per provider (used by UI model selector)
PROVIDER_MODELS: dict = {
    "copilot-oauth": CopilotOAuthClient.SUPPORTED_MODELS,
    "copilot":       [m for m in CopilotClient.MODEL_ALIASES.keys() if "." not in m],
    "github":        [m for m in GitHubModelsClient.MODEL_ALIASES.keys() if "." not in m],
    "openai":        ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo-preview", "gpt-3.5-turbo"],
    "anthropic":     ["claude-sonnet-4-6", "claude-3-7-sonnet", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    "gemini":        ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    "groq":          ["llama-3.3-70b-versatile", "llama-4-scout", "llama-4-maverick", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"],
    "local":         [],
    "copilot-sdk":   ["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-6", "claude-sonnet-4-5"],
}

# How each provider is billed.
# type:
#   "per_token"        – standard USD per 1M input/output LLM tokens
#   "premium_request"  – GitHub Copilot premium-request multiplier (Nx per call)
#   "free"             – local / no external cost
# note: short label shown in the model-selection table cost column
PROVIDER_BILLING: dict = {
    "copilot-oauth": {"type": "premium_request", "note": "GitHub Copilot subscription — premium requests"},
    "copilot":       {"type": "premium_request", "note": "GitHub Copilot subscription — premium requests"},
    "github":        {"type": "per_token",       "note": "USD per 1M tokens (GitHub Models direct)"},
    "openai":        {"type": "per_token",       "note": "USD per 1M tokens (OpenAI API)"},
    "anthropic":     {"type": "per_token",       "note": "USD per 1M tokens (Anthropic API)"},
    "gemini":        {"type": "per_token",       "note": "USD per 1M tokens (Google AI API)"},
    "groq":          {"type": "per_token",       "note": "USD per 1M tokens (Groq API)"},
    "local":         {"type": "free",            "note": "Local model — no API cost"},
    "copilot-sdk":   {"type": "premium_request", "note": "GitHub Copilot CLI via SDK"},
}

# Metadata for each model.
# cost_input / cost_output    : USD per 1M tokens (direct API billing, as of March 2026).
# copilot_multiplier          : GitHub Copilot premium-request multiplier (Nx per call).
#                               0 = free for paid-plan subscribers.
#                               None / absent = not available via Copilot.
MODEL_INFO: dict = {
    # ── OpenAI ─────────────────────────────────────────────────────────────
    "gpt-4o":                     {"context_window": 128_000, "cost_input":  2.50, "cost_output": 10.00, "copilot_multiplier": 0.0,  "notes": "OpenAI flagship — fast, multimodal"},
    "gpt-4o-mini":                {"context_window": 128_000, "cost_input":  0.15, "cost_output":  0.60, "copilot_multiplier": 0.0,  "notes": "Smaller/cheaper GPT-4o variant"},
    "gpt-4.1":                    {"context_window": 128_000, "cost_input":  2.00, "cost_output":  8.00, "copilot_multiplier": 0.0,  "notes": "GPT-4.1 — improved instruction following"},
    "gpt-4.1-mini":               {"context_window": 128_000, "cost_input":  0.40, "cost_output":  1.60, "copilot_multiplier": 0.0,  "notes": "GPT-4.1 mini — fast, cost-efficient"},
    "gpt-4-turbo-preview":        {"context_window": 128_000, "cost_input": 10.00, "cost_output": 30.00,                            "notes": "GPT-4 Turbo preview"},
    "gpt-3.5-turbo":              {"context_window":  16_385, "cost_input":  0.50, "cost_output":  1.50,                            "notes": "Fast and inexpensive"},
    "o1-preview":                 {"context_window": 128_000, "cost_input": 15.00, "cost_output": 60.00,                            "notes": "OpenAI o1 reasoning model (slow)"},
    "o1-mini":                    {"context_window": 128_000, "cost_input":  3.00, "cost_output": 12.00,                            "notes": "Faster o1 reasoning model"},
    "gpt-5-mini":                 {"context_window": 128_000, "cost_input":  0.25, "cost_output":  2.00, "copilot_multiplier": 0.0,  "notes": "GPT-5 mini — free with Copilot paid"},
    # ── Anthropic Claude ───────────────────────────────────────────────────
    "claude-3.5-sonnet":          {"context_window": 200_000, "cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0,  "notes": "Claude 3.5 Sonnet — fast, large context"},
    "claude-3-5-sonnet":          {"context_window": 200_000, "cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0,  "notes": "Claude 3.5 Sonnet — fast, large context"},
    "claude-3-5-sonnet-20241022": {"context_window": 200_000, "cost_input":  3.00, "cost_output": 15.00,                            "notes": "Claude 3.5 Sonnet (dated release)"},
    "claude-3-7-sonnet":          {"context_window": 200_000, "cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0,  "notes": "Claude 3.7 Sonnet — hybrid reasoning"},
    "claude-3-opus-20240229":     {"context_window": 200_000, "cost_input": 15.00, "cost_output": 75.00,                            "notes": "Claude 3 Opus — most capable (dated)"},
    "claude-3-haiku":             {"context_window": 200_000, "cost_input":  0.25, "cost_output":  1.25, "copilot_multiplier": 0.33, "notes": "Claude 3 Haiku — fastest/cheapest"},
    "claude-3-haiku-20240307":    {"context_window": 200_000, "cost_input":  0.25, "cost_output":  1.25,                            "notes": "Claude 3 Haiku (dated release)"},
    "claude-3-opus":              {"context_window": 200_000, "cost_input": 15.00, "cost_output": 75.00, "copilot_multiplier": 3.0,  "notes": "Claude 3 Opus — most capable"},
    "claude-sonnet-4-6":          {"context_window": 200_000, "cost_input":  3.00, "cost_output": 15.00, "copilot_multiplier": 1.0,  "notes": "Claude Sonnet 4.6 — latest Sonnet"},
    # ── Google Gemini ──────────────────────────────────────────────────────
    "gemini-1.5-pro":             {"context_window": 1_000_000, "cost_input": 1.25, "cost_output":  5.00, "notes": "Gemini 1.5 Pro — 1M context"},
    "gemini-1.5-flash":           {"context_window": 1_000_000, "cost_input": 0.075,"cost_output":  0.30, "notes": "Gemini 1.5 Flash — fast"},
    "gemini-2.0-flash":           {"context_window": 1_000_000, "cost_input": 0.10, "cost_output":  0.40, "notes": "Gemini 2.0 Flash (deprecated Jun 2026)"},
    "gemini-2.5-flash":           {"context_window": 1_000_000, "cost_input": 0.30, "cost_output":  2.50, "notes": "Gemini 2.5 Flash — hybrid reasoning"},
    "gemini-2.5-flash-lite":      {"context_window": 1_000_000, "cost_input": 0.10, "cost_output":  0.40, "notes": "Gemini 2.5 Flash-Lite — cost-efficient"},
    "gemini-2.5-pro":             {"context_window": 1_000_000, "cost_input": 1.25, "cost_output": 10.00, "copilot_multiplier": 1.0, "notes": "Gemini 2.5 Pro — state-of-the-art"},
    # ── Groq (fast open-source inference) ─────────────────────────────────
    "llama3-70b-8192":            {"context_window":   8_192, "cost_input": 0.59, "cost_output": 0.79, "notes": "Llama 3 70B on Groq"},
    "llama-3.3-70b-versatile":    {"context_window": 128_000, "cost_input": 0.59, "cost_output": 0.79, "notes": "Llama 3.3 70B Versatile on Groq"},
    "llama-3.1-8b-instant":       {"context_window": 128_000, "cost_input": 0.05, "cost_output": 0.08, "notes": "Llama 3.1 8B Instant on Groq — fastest"},
    "llama-4-scout":              {"context_window": 128_000, "cost_input": 0.11, "cost_output": 0.34, "notes": "Llama 4 Scout on Groq"},
    "llama-4-maverick":           {"context_window": 128_000, "cost_input": 0.20, "cost_output": 0.60, "notes": "Llama 4 Maverick on Groq"},
    "mixtral-8x7b-32768":         {"context_window":  32_768, "cost_input": 0.24, "cost_output": 0.24, "notes": "Mixtral 8x7B on Groq"},
}


def get_llm_provider(
    provider: str = "copilot",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    auth_manager=None,
) -> LLMClient:
    """Factory function to get LLM client."""

    if provider == "copilot-oauth":
        return CopilotOAuthClient(
            model=model or "gpt-4o",
            auth_manager=auth_manager,
        )
    elif provider == "copilot":
        return CopilotClient(
            model=model or "claude-sonnet-4-6",
            api_key=api_key
        )
    elif provider == "github":
        return GitHubModelsClient(
            model=model or "gpt-4o",
            api_key=api_key
        )
    elif provider == "openai":
        return OpenAIClient(
            model=model or "gpt-4-turbo-preview",
            api_key=api_key
        )
    elif provider == "anthropic":
        return AnthropicClient(
            model=model or "claude-3-opus-20240229",
            api_key=api_key
        )
    elif provider == "gemini":
        return GeminiClient(
            model=model or "gemini-1.5-pro",
            api_key=api_key
        )
    elif provider == "copilot-sdk":
        return CopilotSdkClient(
            model=model or "gpt-4o",
            api_key=api_key
        )
    elif provider == "groq":
        return GroqClient(
            model=model or "llama-3.3-70b-versatile",
            api_key=api_key
        )
    elif provider == "local":
        return LocalLLMClient(
            model=model or "mistralai/Mistral-7B-Instruct-v0.2"
        )
    else:
        raise ValueError(f"Unknown provider: {provider}. Choose from: copilot-oauth, copilot, github, openai, anthropic, gemini, groq, local, copilot-sdk")
