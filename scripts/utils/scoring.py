"""
Relevance scoring utilities for content selection.
"""

import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple, Any
from collections import Counter


def calculate_relevance_score(
    item: Dict,
    job_keywords: Set[str],
    job_requirements: List[str],
    domain_context: str = ''
) -> float:
    """
    Calculate relevance score for a CV item (experience, skill, achievement).
    
    Scoring factors:
    - Keyword matches in description/text
    - Importance rating (1-10 from master data)
    - Domain relevance matches
    - Audience tags matching job context
    
    Args:
        item: CV data item (experience, skill, achievement)
        job_keywords: Set of keywords from job description
        job_requirements: List of requirement phrases
        domain_context: Domain/industry context from job
        
    Returns:
        Relevance score (0.0 to 100.0)
    """
    score = 0.0
    
    # Base importance from master data (0-40 points)
    importance = item.get('importance', 5)
    score += importance * 4.0
    
    # Keyword matching (0-30 points)
    item_text = _extract_text(item).lower()
    item_keywords = set(_extract_keywords(item_text))
    
    keyword_matches = len(job_keywords.intersection(item_keywords))
    max_keywords = max(len(job_keywords), 1)
    keyword_score = (keyword_matches / max_keywords) * 30.0
    score += keyword_score
    
    # Domain relevance (0-15 points)
    domain_relevance = item.get('domain_relevance', [])
    if isinstance(domain_relevance, list):
        if domain_context and any(domain_context.lower() in dr.lower() for dr in domain_relevance):
            score += 15.0
        elif domain_relevance:  # Has some domain tags
            score += 7.5
    
    # Audience tag match (0-10 points)
    audience = item.get('audience', [])
    if isinstance(audience, list) and audience:
        # Boost if it has audience tags (indicates targeted content)
        score += 10.0
    
    # Requirement phrase matching (0-5 points)
    requirement_matches = sum(
        1 for req in job_requirements
        if req.lower() in item_text
    )
    if requirement_matches > 0:
        score += min(requirement_matches * 2.5, 5.0)
    
    return min(score, 100.0)


def _extract_text(item: Dict) -> str:
    """Extract searchable text from an item."""
    text_parts = []
    
    # Common fields
    for field in ['title', 'company', 'description', 'name', 'text', 'summary']:
        if field in item:
            value = item[field]
            if isinstance(value, str):
                text_parts.append(value)
    
    # Achievements/projects
    if 'achievements' in item:
        for ach in item['achievements']:
            if isinstance(ach, dict):
                text_parts.append(ach.get('description', ''))
            elif isinstance(ach, str):
                text_parts.append(ach)
    
    if 'projects' in item:
        for proj in item['projects']:
            if isinstance(proj, dict):
                text_parts.append(proj.get('description', ''))
    
    # Keywords
    if 'keywords' in item:
        keywords = item['keywords']
        if isinstance(keywords, list):
            text_parts.extend(keywords)
        elif isinstance(keywords, str):
            text_parts.append(keywords)
    
    return ' '.join(text_parts)


def _extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from text."""
    # Remove punctuation and split
    words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#\-]*\b', text)
    
    # Filter stopwords
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    }
    
    keywords = [w.lower() for w in words if len(w) > 2 and w.lower() not in stopwords]
    return keywords


def rank_content(
    items: List[Dict],
    job_keywords: Set[str],
    job_requirements: List[str],
    domain_context: str = '',
    top_n: int = None
) -> List[Tuple[Dict, float]]:
    """
    Rank CV items by relevance score.
    
    Args:
        items: List of CV items to rank
        job_keywords: Keywords from job description
        job_requirements: Requirement phrases from job
        domain_context: Domain/industry context
        top_n: Return only top N items (None for all)
        
    Returns:
        List of (item, score) tuples, sorted by score descending
    """
    scored_items = []
    
    for item in items:
        score = calculate_relevance_score(
            item, job_keywords, job_requirements, domain_context
        )
        scored_items.append((item, score))
    
    # Sort by score descending
    scored_items.sort(key=lambda x: x[1], reverse=True)
    
    if top_n:
        return scored_items[:top_n]
    
    return scored_items


def extract_job_keywords(job_text: str) -> Set[str]:
    """
    Extract important keywords from job description.
    
    Focus on:
    - Technical skills (Python, AWS, Docker, etc.)
    - Domain terms (genomics, machine learning, etc.)
    - Key phrases (data analysis, team leadership, etc.)
    
    Args:
        job_text: Full job description text
        
    Returns:
        Set of extracted keywords
    """
    keywords = set()
    
    # Extract n-grams for technical terms
    text_lower = job_text.lower()
    
    # Technical skills patterns
    tech_patterns = [
        r'\b(?:python|r|java|javascript|c\+\+|sql|nosql)\b',
        r'\b(?:aws|azure|gcp|docker|kubernetes|jenkins)\b',
        r'\b(?:tensorflow|pytorch|scikit-learn|pandas|numpy)\b',
        r'\b(?:git|github|gitlab|jira|confluence)\b',
        r'\b(?:rest|api|microservices|backend|frontend)\b',
        r'\b(?:linux|unix|windows|macos)\b',
    ]
    
    for pattern in tech_patterns:
        matches = re.findall(pattern, text_lower)
        keywords.update(matches)
    
    # Extract capitalized terms (often tools/frameworks)
    cap_terms = re.findall(r'\b[A-Z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*\b', job_text)
    keywords.update(term.lower() for term in cap_terms if len(term) > 2)
    
    # Extract multi-word phrases (e.g., "machine learning", "data science")
    phrases = re.findall(
        r'\b(?:machine learning|data science|deep learning|natural language processing|'
        r'computer vision|data analysis|statistical modeling|software development|'
        r'team leadership|project management|agile|scrum|devops|ci/cd)\b',
        text_lower
    )
    keywords.update(phrases)
    
    # Add individual words from phrases
    for phrase in phrases:
        keywords.update(phrase.split())
    
    # Extract all significant words (fallback)
    all_words = _extract_keywords(job_text)
    word_freq = Counter(all_words)
    
    # Add frequently mentioned words
    for word, count in word_freq.most_common(50):
        if count >= 2 and len(word) > 3:
            keywords.add(word)
    
    return keywords


def select_best_summary(
    summaries: List[Dict],
    job_keywords: Set[str],
    job_title: str = ''
) -> Dict:
    """
    Select the most appropriate professional summary for a job.
    
    Args:
        summaries: List of professional summary variants
        job_keywords: Keywords from job description
        job_title: Job title for context
        
    Returns:
        Best matching summary
    """
    if not summaries:
        return {}
    
    scored = []
    job_title_lower = job_title.lower()
    
    for summary in summaries:
        score = 0
        
        # Match by audience tag
        audience = summary.get('audience', [])
        if isinstance(audience, list):
            for aud in audience:
                aud_lower = aud.lower()
                if any(term in aud_lower for term in ['executive', 'leadership', 'director', 'chief']):
                    if any(term in job_title_lower for term in ['director', 'vp', 'chief', 'head', 'executive']):
                        score += 30
                elif 'data' in aud_lower or 'science' in aud_lower:
                    if 'data' in job_title_lower or 'scientist' in job_title_lower:
                        score += 25
                elif 'bioinformatics' in aud_lower or 'computational biology' in aud_lower:
                    if any(term in job_title_lower for term in ['bioinformatics', 'computational', 'biology']):
                        score += 25
                elif 'software' in aud_lower or 'engineer' in aud_lower:
                    if any(term in job_title_lower for term in ['software', 'engineer', 'developer']):
                        score += 25
        
        # Keyword overlap
        summary_text = summary.get('summary', '').lower()
        summary_keywords = set(_extract_keywords(summary_text))
        keyword_overlap = len(job_keywords.intersection(summary_keywords))
        score += keyword_overlap * 2
        
        scored.append((summary, score))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]


def calculate_skill_score(
    skill: Dict,
    job_keywords: Set[str],
    required_skills: List[str]
) -> float:
    """
    Calculate relevance score for a skill.
    
    Args:
        skill: Skill dictionary
        job_keywords: Keywords from job
        required_skills: List of explicitly required skills
        
    Returns:
        Score 0-100
    """
    score = 0.0
    
    skill_name = skill.get('name', '').lower()
    skill_keywords = skill.get('keywords', [])
    if isinstance(skill_keywords, str):
        skill_keywords = [skill_keywords]
    
    # Direct match with required skills (40 points)
    for req_skill in required_skills:
        if req_skill.lower() in skill_name or any(req_skill.lower() in kw.lower() for kw in skill_keywords):
            score += 40
            break
    
    # Keyword matching (30 points)
    all_skill_terms = [skill_name] + [kw.lower() for kw in skill_keywords]
    matches = sum(1 for term in all_skill_terms if any(jk in term for jk in job_keywords))
    if matches > 0:
        score += min(matches * 10, 30)
    
    # Proficiency level (20 points)
    proficiency = skill.get('proficiency', 'intermediate')
    if proficiency in ['expert', 'advanced']:
        score += 20
    elif proficiency == 'intermediate':
        score += 10
    
    # Years of experience (10 points)
    years = skill.get('years', 0)
    if years >= 5:
        score += 10
    elif years >= 2:
        score += 5

    return min(score, 100.0)


# ---------------------------------------------------------------------------
# ATS match scoring (Phase 2 / GAP-21)
# ---------------------------------------------------------------------------

def compute_ats_score(
    job_analysis: Dict,
    customizations: Optional[Dict],
    basis: str = "review_checkpoint",
) -> Dict:
    """Compute an ATS match score for the current session state.

    Returns a dict matching the Phase 0 contract ATS score schema::

        {
            "overall": float,               # 0-100
            "hard_requirement_score": float,
            "soft_requirement_score": float,
            "keyword_status": [...],
            "section_scores": {...},
            "computed_at": str,             # ISO-8601
            "basis": str
        }

    Args:
        job_analysis:  The job_analysis dict from session state.
        customizations: The customizations dict (approved skills, rewrites, etc.)
                        May be None if not yet available.
        basis: One of "analysis", "review_checkpoint", "post_generation".
    """
    required_skills: List[str] = job_analysis.get("required_skills", [])
    nice_to_have: List[str] = job_analysis.get("nice_to_have_skills", [])
    ats_keywords: List[str] = job_analysis.get("ats_keywords", [])

    # Build candidate text corpus from customizations
    candidate_terms: Set[str] = set()
    section_matches: Dict[str, Set[str]] = {
        "skills": set(),
        "experience": set(),
        "education": set(),
        "summary": set(),
    }

    if customizations:
        # Approved skills
        approved_skills = customizations.get("approved_skills", [])
        for skill in approved_skills:
            if isinstance(skill, dict):
                name = skill.get("name", "")
            else:
                name = str(skill)
            term = name.lower().strip()
            if term:
                candidate_terms.add(term)
                section_matches["skills"].add(term)

        # Skill categories (flat dict of category → list)
        skill_cats = customizations.get("skills", {})
        if isinstance(skill_cats, dict):
            for cat_skills in skill_cats.values():
                if isinstance(cat_skills, list):
                    for s in cat_skills:
                        term = s.lower().strip() if isinstance(s, str) else ""
                        if term:
                            candidate_terms.add(term)
                            section_matches["skills"].add(term)
        elif isinstance(skill_cats, list):
            for s in skill_cats:
                term = s.lower().strip() if isinstance(s, str) else ""
                if term:
                    candidate_terms.add(term)
                    section_matches["skills"].add(term)

        # Approved rewrites (experience bullets)
        approved_rewrites = customizations.get("approved_rewrites", [])
        for rw in approved_rewrites:
            text = ""
            if isinstance(rw, dict):
                text = rw.get("rewritten", rw.get("original", ""))
            elif isinstance(rw, str):
                text = rw
            for kw in _extract_keywords(text.lower()):
                candidate_terms.add(kw)
                section_matches["experience"].add(kw)

        # Summary
        summary = customizations.get("selected_summary", "")
        if summary:
            for kw in _extract_keywords(summary.lower()):
                candidate_terms.add(kw)
                section_matches["summary"].add(kw)

    def _is_matched(keyword: str) -> Tuple[bool, List[str]]:
        """Return (matched, sections_list) for a keyword."""
        kw_lower = keyword.lower().strip()
        kw_words = set(kw_lower.split())
        matched_in: List[str] = []
        for sec, terms in section_matches.items():
            # Exact whole-keyword match
            if kw_lower in terms:
                matched_in.append(sec)
                continue
            # Substring / token overlap
            for term in terms:
                if kw_lower in term or term in kw_lower:
                    matched_in.append(sec)
                    break
                if kw_words & set(term.split()):
                    matched_in.append(sec)
                    break
        return bool(matched_in), list(dict.fromkeys(matched_in))

    # ── Build keyword_status list ──────────────────────────────────────────
    keyword_status: List[Dict] = []
    hard_matched = hard_total = 0
    soft_matched = soft_total = 0

    # Hard requirements
    for kw in required_skills:
        matched, sections = _is_matched(kw)
        keyword_status.append({
            "keyword": kw,
            "type": "hard",
            "status": "matched" if matched else "missing",
            "matched_in_sections": sections,
            "match_type": "exact" if matched else "none",
        })
        hard_total += 1
        if matched:
            hard_matched += 1

    # Soft / nice-to-have
    for kw in nice_to_have:
        matched, sections = _is_matched(kw)
        keyword_status.append({
            "keyword": kw,
            "type": "soft",
            "status": "matched" if matched else "missing",
            "matched_in_sections": sections,
            "match_type": "exact" if matched else "none",
        })
        soft_total += 1
        if matched:
            soft_matched += 1

    # Bonus ATS keywords (not already listed)
    listed_kws = {k.lower() for k in required_skills + nice_to_have}
    for kw in ats_keywords:
        if kw.lower() not in listed_kws:
            matched, sections = _is_matched(kw)
            keyword_status.append({
                "keyword": kw,
                "type": "bonus",
                "status": "matched" if matched else "missing",
                "matched_in_sections": sections,
                "match_type": "exact" if matched else "none",
            })

    # ── Compute sub-scores ────────────────────────────────────────────────
    hard_score = (hard_matched / hard_total * 100.0) if hard_total else 100.0
    soft_score = (soft_matched / soft_total * 100.0) if soft_total else 100.0

    # Overall: 70% hard, 30% soft
    overall = round(0.7 * hard_score + 0.3 * soft_score, 1)

    # ── Section scores ────────────────────────────────────────────────────
    all_keywords = {k.lower() for k in required_skills + nice_to_have + ats_keywords}
    section_scores: Dict[str, float] = {}
    for sec, terms in section_matches.items():
        if not all_keywords:
            section_scores[sec] = 0.0
            continue
        hits = len(all_keywords & terms)
        section_scores[sec] = round(hits / len(all_keywords) * 100.0, 1)

    return {
        "overall": overall,
        "hard_requirement_score": round(hard_score, 1),
        "soft_requirement_score": round(soft_score, 1),
        "keyword_status": keyword_status,
        "section_scores": section_scores,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "basis": basis,
    }
