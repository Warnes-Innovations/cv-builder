# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
BibTeX parsing utilities for publications.bib
"""

import os
import tempfile

import pybtex.database
from typing import Dict, List, Optional

# Ordered list of standard BibTeX fields — author is written first, then these
# in order, then any remaining custom fields.
_STANDARD_FIELD_ORDER: List[str] = [
    'title', 'year', 'journal', 'booktitle', 'volume', 'number', 'pages',
    'publisher', 'address', 'school', 'institution', 'organization',
    'series', 'chapter', 'edition', 'howpublished',
    'doi', 'url', 'isbn', 'issn', 'note', 'abstract', 'keywords',
]
# Note: 'author' and 'editor' are person roles handled before this list in
# serialize_bibtex_entry() so they always appear first in the output.


def _person_to_bibtex_str(person) -> str:
    """Reconstruct a pybtex Person as a BibTeX author string fragment.

    Produces the ``von Last, Jr, First Middle`` form.  All name parts are
    lists of strings inside the Person object; we join them with spaces and
    then assemble the comma-separated BibTeX notation.
    """
    # "von Last" — prelast_names contains lowercase particles like "van", "de"
    last_parts = list(person.prelast_names) + list(person.last_names)
    last = ' '.join(last_parts)

    lineage = ' '.join(person.lineage_names)          # Jr., III, …
    given   = ' '.join(list(person.first_names) + list(person.middle_names))

    if lineage and given:
        return f"{last}, {lineage}, {given}"
    elif lineage:
        return f"{last}, {lineage}"
    elif given:
        return f"{last}, {given}"
    return last


def _persons_to_bibtex_field(persons: list) -> str:
    """Join pybtex Person objects with ' and ' — BibTeX author field format."""
    return ' and '.join(_person_to_bibtex_str(p) for p in persons)


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

        # Person roles (author, editor) live in entry.persons, NOT entry.fields.
        # Add them to pub['fields'] in BibTeX notation so they survive serialization.
        for role, persons in entry.persons.items():
            if persons:
                pub['fields'][role] = _persons_to_bibtex_field(persons)

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


# ---------------------------------------------------------------------------
# BibTeX serialization — write pub dicts back to .bib file format
# ---------------------------------------------------------------------------

def serialize_bibtex_entry(pub: Dict) -> str:
    """Serialize one publication dict to a BibTeX @entry{key, ...} block.

    The ``pub`` dict comes from :func:`parse_bibtex_file` (or is constructed
    for a new entry) and must contain at minimum:
        - ``key``   — the cite key
        - ``type``  — the BibTeX entry type (e.g. 'article', 'inproceedings')
        - ``fields``— a dict mapping field name → raw field value

    Author names should be in ``fields['author']`` in BibTeX notation
    (``Last, First and Last2, First2``).  The "display" ``authors`` key is
    ignored here.
    """
    key        = pub.get('key', 'unknown')
    entry_type = pub.get('type', 'misc')
    fields     = dict(pub.get('fields', {}))

    lines = [f"@{entry_type}{{{key},"]

    # 1. person roles first (author, then editor) — both may appear in fields
    #    after parse_bibtex_file injects pybtex persons into pub['fields']
    if 'author' in fields:
        _append_field(lines, 'author', fields.pop('author'))
    if 'editor' in fields:
        _append_field(lines, 'editor', fields.pop('editor'))

    # 2. standard fields in canonical order
    for fname in _STANDARD_FIELD_ORDER:
        if fname in fields:
            _append_field(lines, fname, fields.pop(fname))

    # 3. any remaining custom fields
    for fname, fval in sorted(fields.items()):
        _append_field(lines, fname, fval)

    lines.append("}")
    return "\n".join(lines)


def _append_field(lines: List[str], name: str, value: str) -> None:
    """Append a field line only when the value is non-empty."""
    v = str(value).strip() if value is not None else ''
    if v:
        lines.append(f"  {name:<14} = {{{v}}},")


def serialize_publications_to_bibtex(publications: Dict[str, Dict]) -> str:
    """Serialize all publications to a complete .bib file string.

    Entries are written in descending year order (newest first), then
    alphabetically by cite key within the same year.
    """
    def _sort_key(item):
        pub = item[1]
        try:
            year = -int(str(pub.get('year') or pub.get('fields', {}).get('year', '0')).strip())
        except (ValueError, TypeError):
            year = 0
        return (year, item[0])

    sorted_pubs = sorted(publications.items(), key=_sort_key)
    return "\n\n".join(serialize_bibtex_entry(pub) for _, pub in sorted_pubs) + "\n"


def bibtex_text_to_publications(bibtex_text: str) -> Dict[str, Dict]:
    """Parse raw BibTeX text (not a file path) into a publications dict.

    Returns an empty dict if the text is empty or invalid.
    """
    text = (bibtex_text or '').strip()
    if not text:
        return {}

    # pybtex only reads from files, so write to a temp file
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.bib', delete=False,
                                         encoding='utf-8') as tmp:
            tmp.write(text)
            tmp_path = tmp.name
        return parse_bibtex_file(tmp_path)
    except Exception:
        return {}
    finally:
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

