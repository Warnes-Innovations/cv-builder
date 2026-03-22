# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
BibTeX parsing utilities for publications.bib
"""

import pybtex.database
from typing import Dict, List, Optional


def parse_bibtex_file(filepath: str) -> Dict[str, Dict]:
    """
    Parse a BibTeX file and return entries as a dictionary.
    
    Args:
        filepath: Path to .bib file
        
    Returns:
        Dictionary mapping entry keys to publication data
    """
    bib_data = pybtex.database.parse_file(filepath)
    
    publications = {}
    for key, entry in bib_data.entries.items():
        pub = {
            'key': key,
            'type': entry.type,
            'title': entry.fields.get('title', ''),
            'year': entry.fields.get('year', ''),
            'authors': _format_authors(entry.persons.get('author', [])),
            'fields': dict(entry.fields),
        }
        
        # Add type-specific fields
        if entry.type == 'article':
            pub['journal'] = entry.fields.get('journal', '')
            pub['volume'] = entry.fields.get('volume', '')
            pub['pages'] = entry.fields.get('pages', '')
        elif entry.type in ['inproceedings', 'conference']:
            pub['booktitle'] = entry.fields.get('booktitle', '')
        elif entry.type == 'techreport':
            pub['institution'] = entry.fields.get('institution', '')
            pub['number'] = entry.fields.get('number', '')
        elif entry.type == 'phdthesis':
            pub['school'] = entry.fields.get('school', '')
        elif entry.type == 'misc':
            pub['note'] = entry.fields.get('note', '')
            pub['url'] = entry.fields.get('url', '')
            
        publications[key] = pub
    
    return publications


def _format_authors(authors: List) -> str:
    """Format author list for display."""
    if not authors:
        return ''
    
    author_names = []
    for author in authors:
        # Get last name and first name
        last = ' '.join(author.last_names)
        first = ' '.join(author.first_names)
        middle = ' '.join(author.middle_names)
        
        if middle:
            author_names.append(f"{last}, {first} {middle}")
        else:
            author_names.append(f"{last}, {first}")
    
    if len(author_names) == 1:
        return author_names[0]
    elif len(author_names) == 2:
        return f"{author_names[0]} and {author_names[1]}"
    else:
        # More than 2 authors - use "et al." for brevity
        return f"{author_names[0]} et al."


def format_publication(pub: Dict, style: str = 'apa') -> str:
    """
    Format a publication entry for display in CV.
    
    Args:
        pub: Publication dictionary from parse_bibtex_file
        style: Citation style ('apa', 'ieee', 'brief')
        
    Returns:
        Formatted publication string
    """
    if style == 'brief':
        return _format_brief(pub)
    elif style == 'ieee':
        return _format_ieee(pub)
    else:  # default to APA-like
        return _format_apa(pub)


def _format_brief(pub: Dict) -> str:
    """Brief format: Authors (Year). Title. Journal/Venue."""
    parts = []
    
    if pub['authors']:
        parts.append(pub['authors'])
    
    if pub['year']:
        parts.append(f"({pub['year']})")
    
    if pub['title']:
        # Remove LaTeX formatting
        title = pub['title'].replace('{', '').replace('}', '')
        parts.append(f"{title}.")
    
    if pub['type'] == 'article' and 'journal' in pub:
        parts.append(f"{pub['journal']}.")
    elif pub['type'] in ['inproceedings', 'conference'] and 'booktitle' in pub:
        parts.append(f"{pub['booktitle']}.")
    elif pub['type'] == 'techreport' and 'institution' in pub:
        parts.append(f"{pub['institution']}.")
    
    return ' '.join(parts)


def _format_apa(pub: Dict) -> str:
    """APA-style format."""
    parts = []
    
    # Authors and year
    if pub['authors']:
        parts.append(f"{pub['authors']}.")
    
    if pub['year']:
        parts.append(f"({pub['year']}).")
    
    # Title
    if pub['title']:
        title = pub['title'].replace('{', '').replace('}', '')
        parts.append(f"{title}.")
    
    # Publication venue
    if pub['type'] == 'article':
        venue_parts = []
        if 'journal' in pub:
            venue_parts.append(f"*{pub['journal']}*")
        if 'volume' in pub:
            venue_parts.append(pub['volume'])
        if 'pages' in pub:
            venue_parts.append(pub['pages'])
        if venue_parts:
            parts.append(', '.join(venue_parts) + '.')
    
    elif pub['type'] in ['inproceedings', 'conference']:
        if 'booktitle' in pub:
            parts.append(f"In *{pub['booktitle']}*.")
    
    elif pub['type'] == 'techreport':
        if 'institution' in pub:
            parts.append(f"{pub['institution']}.")
        if 'number' in pub:
            parts.append(f"Technical Report {pub['number']}.")
    
    elif pub['type'] == 'phdthesis':
        if 'school' in pub:
            parts.append(f"Doctoral dissertation, {pub['school']}.")
    
    elif pub['type'] == 'misc':
        if 'note' in pub:
            parts.append(f"{pub['note']}.")
    
    return ' '.join(parts)


def _format_ieee(pub: Dict) -> str:
    """IEEE-style format."""
    parts = []
    
    # Authors
    if pub['authors']:
        # IEEE uses initials for first names
        parts.append(f"{pub['authors']},")
    
    # Title in quotes
    if pub['title']:
        title = pub['title'].replace('{', '').replace('}', '')
        parts.append(f'"{title},"')
    
    # Journal/venue
    if pub['type'] == 'article' and 'journal' in pub:
        venue = f"*{pub['journal']}*"
        if 'volume' in pub:
            venue += f", vol. {pub['volume']}"
        if 'pages' in pub:
            venue += f", pp. {pub['pages']}"
        if 'year' in pub:
            venue += f", {pub['year']}"
        parts.append(venue + '.')
    
    elif pub['type'] in ['inproceedings', 'conference'] and 'booktitle' in pub:
        venue = f"in *{pub['booktitle']}*"
        if 'year' in pub:
            venue += f", {pub['year']}"
        parts.append(venue + '.')
    
    else:
        if 'year' in pub:
            parts.append(f"{pub['year']}.")
    
    return ' '.join(parts)


def filter_publications(
    publications: Dict[str, Dict],
    pub_type: Optional[str] = None,
    min_year: Optional[int] = None,
    keywords: Optional[List[str]] = None
) -> Dict[str, Dict]:
    """
    Filter publications by type, year, and keywords.
    
    Args:
        publications: Dictionary of publications
        pub_type: Filter by type ('article', 'misc', etc.)
        min_year: Minimum year (inclusive)
        keywords: List of keywords to search in title
        
    Returns:
        Filtered dictionary of publications
    """
    filtered = {}
    
    for key, pub in publications.items():
        # Type filter
        if pub_type and pub['type'] != pub_type:
            continue
        
        # Year filter
        if min_year:
            try:
                year = int(pub['year'])
                if year < min_year:
                    continue
            except (ValueError, KeyError):
                continue
        
        # Keyword filter
        if keywords:
            title_lower = pub['title'].lower()
            if not any(kw.lower() in title_lower for kw in keywords):
                continue
        
        filtered[key] = pub
    
    return filtered


def get_software_publications(publications: Dict[str, Dict]) -> Dict[str, Dict]:
    """Extract software/R package publications."""
    return {
        key: pub for key, pub in publications.items()
        if pub['type'] == 'misc' and 'package' in pub.get('note', '').lower()
    }


def get_journal_articles(publications: Dict[str, Dict]) -> Dict[str, Dict]:
    """Extract peer-reviewed journal articles."""
    return {
        key: pub for key, pub in publications.items()
        if pub['type'] == 'article'
    }
