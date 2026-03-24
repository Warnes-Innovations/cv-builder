# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
BibTeX parsing utilities for publications.bib
"""

from typing import Dict, List, Optional

import bibtexparser  # type: ignore[import-untyped]
from bibtexparser.bparser import BibTexParser  # type: ignore[import-untyped]
from bibtexparser.customization import (  # type: ignore[import-untyped]
    InvalidName,
    author as split_author_field,
    convert_to_unicode,
    splitname,
)

# Ordered list of standard BibTeX fields — author is written first, then these
# in order, then any remaining custom fields.
_STANDARD_FIELD_ORDER: List[str] = [
    "title",
    "year",
    "journal",
    "booktitle",
    "volume",
    "number",
    "pages",
    "publisher",
    "address",
    "school",
    "institution",
    "organization",
    "series",
    "chapter",
    "edition",
    "howpublished",
    "doi",
    "url",
    "isbn",
    "issn",
    "note",
    "abstract",
    "keywords",
]
# Note: 'author' and 'editor' are person roles handled before this list in
# serialize_bibtex_entry() so they always appear first in the output.


def _build_parser() -> BibTexParser:
    """Create a bibtexparser parser with the repo's expected defaults."""
    parser = BibTexParser(common_strings=True)
    parser.customization = convert_to_unicode
    return parser


def _load_bibtex_entries(bibtex_text: str) -> List[Dict[str, str]]:
    """Parse raw BibTeX text into bibtexparser entry dictionaries."""
    database = bibtexparser.loads(bibtex_text or "", parser=_build_parser())
    return database.entries


def _split_bibtex_names(names: str | List[str] | None) -> List[str]:
    """Split a raw BibTeX author/editor field into individual names."""
    if names is None:
        return []

    if isinstance(names, list):
        return [name.strip() for name in names if str(name).strip()]

    raw_names = str(names).strip()
    if not raw_names:
        return []

    try:
        return split_author_field({"author": raw_names}).get("author", [])
    except (AttributeError, TypeError, ValueError):
        return [
            name.strip() for name in raw_names.split(" and ") if name.strip()
        ]


def _is_bibtex_others_token(name: str) -> bool:
    """Return True when a split author token is BibTeX's special `others`."""
    normalized = name.strip().strip(",").strip()
    normalized = normalized.removeprefix("{").removesuffix("}").strip()
    return normalized.lower() == "others"


def _normalize_bibtex_name_token(name: str) -> str:
    """Return a cleaned raw BibTeX name token for display fallbacks."""
    return name.strip().strip(",").strip()


def _entry_to_publication(entry: Dict[str, str]) -> Dict[str, Dict | str]:
    """Convert one bibtexparser entry into the repo's publication shape."""
    key = entry.get("ID", "")
    entry_type = entry.get("ENTRYTYPE", "")
    fields = {
        field_name: field_value
        for field_name, field_value in entry.items()
        if field_name not in {"ID", "ENTRYTYPE"}
    }
    publication: Dict[str, Dict | str] = {
        "key": key,
        "type": entry_type,
        "title": fields.get("title", ""),
        "year": fields.get("year", ""),
        "authors": _format_authors(fields.get("author")),
        "fields": fields,
    }

    if entry_type == "article":
        publication["journal"] = fields.get("journal", "")
        publication["volume"] = fields.get("volume", "")
        publication["pages"] = fields.get("pages", "")
    elif entry_type in ["inproceedings", "conference"]:
        publication["booktitle"] = fields.get("booktitle", "")
    elif entry_type == "techreport":
        publication["institution"] = fields.get("institution", "")
        publication["number"] = fields.get("number", "")
    elif entry_type == "phdthesis":
        publication["school"] = fields.get("school", "")
    elif entry_type == "misc":
        publication["note"] = fields.get("note", "")
        publication["url"] = fields.get("url", "")

    return publication


def parse_bibtex_file(filepath: str) -> Dict[str, Dict]:
    """
    Parse a BibTeX file and return entries as a dictionary.

    Args:
        filepath: Path to .bib file

    Returns:
        Dictionary mapping entry keys to publication data
    """
    with open(filepath, "r", encoding="utf-8") as handle:
        bib_entries = _load_bibtex_entries(handle.read())

    publications = {}
    for entry in bib_entries:
        publication = _entry_to_publication(entry)
        publications[str(publication["key"])] = publication

    return publications


def _format_authors(authors: str | List[str] | None) -> str:
    """Format author list for display."""
    if not authors:
        return ""

    author_names = []
    has_others = False
    for author_name in _split_bibtex_names(authors):
        cleaned_author_name = _normalize_bibtex_name_token(author_name)
        if not cleaned_author_name:
            continue

        if _is_bibtex_others_token(cleaned_author_name):
            has_others = True
            continue

        try:
            parsed_name = splitname(cleaned_author_name)
        except (InvalidName, TypeError, ValueError):
            author_names.append(cleaned_author_name)
            continue

        last_parts = parsed_name.get("von", []) + parsed_name.get("last", [])
        given_parts = parsed_name.get("first", []) + parsed_name.get("jr", [])
        last = " ".join(last_parts).strip()
        given = " ".join(given_parts).strip()

        if last and given:
            author_names.append(f"{last}, {given}")
        elif last:
            author_names.append(last)
        else:
            author_names.append(cleaned_author_name)

    if not author_names:
        return "et al." if has_others else ""

    if has_others or len(author_names) > 2:
        return f"{author_names[0]} et al."
    elif len(author_names) == 1:
        return author_names[0]
    elif len(author_names) == 2:
        return f"{author_names[0]} and {author_names[1]}"
    else:
        return author_names[0]


def format_publication(pub: Dict, style: str = "apa") -> str:
    """
    Format a publication entry for display in CV.

    Args:
        pub: Publication dictionary from parse_bibtex_file
        style: Citation style ('apa', 'ieee', 'brief')

    Returns:
        Formatted publication string
    """
    if style == "brief":
        return _format_brief(pub)
    elif style == "ieee":
        return _format_ieee(pub)
    else:  # default to APA-like
        return _format_apa(pub)


def _format_brief(pub: Dict) -> str:
    """Brief format: Authors (Year). Title. Journal/Venue."""
    parts = []

    if pub["authors"]:
        parts.append(pub["authors"])

    if pub["year"]:
        parts.append(f"({pub['year']})")

    if pub["title"]:
        # Remove LaTeX formatting
        title = pub["title"].replace("{", "").replace("}", "")
        parts.append(f"{title}.")

    if pub["type"] == "article" and "journal" in pub:
        parts.append(f"{pub['journal']}.")
    elif pub["type"] in ["inproceedings", "conference"] and "booktitle" in pub:
        parts.append(f"{pub['booktitle']}.")
    elif pub["type"] == "techreport" and "institution" in pub:
        parts.append(f"{pub['institution']}.")

    return " ".join(parts)


def _format_apa(pub: Dict) -> str:
    """APA-style format."""
    parts = []

    # Authors and year
    if pub["authors"]:
        parts.append(f"{pub['authors']}.")

    if pub["year"]:
        parts.append(f"({pub['year']}).")

    # Title
    if pub["title"]:
        title = pub["title"].replace("{", "").replace("}", "")
        parts.append(f"{title}.")

    # Publication venue
    if pub["type"] == "article":
        venue_parts = []
        if "journal" in pub:
            venue_parts.append(f"*{pub['journal']}*")
        if "volume" in pub:
            venue_parts.append(pub["volume"])
        if "pages" in pub:
            venue_parts.append(pub["pages"])
        if venue_parts:
            parts.append(", ".join(venue_parts) + ".")

    elif pub["type"] in ["inproceedings", "conference"]:
        if "booktitle" in pub:
            parts.append(f"In *{pub['booktitle']}*.")

    elif pub["type"] == "techreport":
        if "institution" in pub:
            parts.append(f"{pub['institution']}.")
        if "number" in pub:
            parts.append(f"Technical Report {pub['number']}.")

    elif pub["type"] == "phdthesis":
        if "school" in pub:
            parts.append(f"Doctoral dissertation, {pub['school']}.")

    elif pub["type"] == "misc":
        if "note" in pub:
            parts.append(f"{pub['note']}.")

    return " ".join(parts)


def _format_ieee(pub: Dict) -> str:
    """IEEE-style format."""
    parts = []

    # Authors
    if pub["authors"]:
        # IEEE uses initials for first names
        parts.append(f"{pub['authors']},")

    # Title in quotes
    if pub["title"]:
        title = pub["title"].replace("{", "").replace("}", "")
        parts.append(f'"{title},"')

    # Journal/venue
    if pub["type"] == "article" and "journal" in pub:
        venue = f"*{pub['journal']}*"
        if "volume" in pub:
            venue += f", vol. {pub['volume']}"
        if "pages" in pub:
            venue += f", pp. {pub['pages']}"
        if "year" in pub:
            venue += f", {pub['year']}"
        parts.append(venue + ".")

    elif pub["type"] in ["inproceedings", "conference"] and "booktitle" in pub:
        venue = f"in *{pub['booktitle']}*"
        if "year" in pub:
            venue += f", {pub['year']}"
        parts.append(venue + ".")

    else:
        if "year" in pub:
            parts.append(f"{pub['year']}.")

    return " ".join(parts)


def filter_publications(
    publications: Dict[str, Dict],
    pub_type: Optional[str] = None,
    min_year: Optional[int] = None,
    keywords: Optional[List[str]] = None,
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
        if pub_type and pub["type"] != pub_type:
            continue

        # Year filter
        if min_year:
            try:
                year = int(pub["year"])
                if year < min_year:
                    continue
            except (ValueError, KeyError):
                continue

        # Keyword filter
        if keywords:
            title_lower = pub["title"].lower()
            if not any(kw.lower() in title_lower for kw in keywords):
                continue

        filtered[key] = pub

    return filtered


def get_software_publications(
    publications: Dict[str, Dict],
) -> Dict[str, Dict]:
    """Extract software/R package publications."""
    return {
        key: pub
        for key, pub in publications.items()
        if pub["type"] == "misc" and "package" in pub.get("note", "").lower()
    }


def get_journal_articles(publications: Dict[str, Dict]) -> Dict[str, Dict]:
    """Extract peer-reviewed journal articles."""
    return {
        key: pub
        for key, pub in publications.items()
        if pub["type"] == "article"
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
    key = pub.get("key", "unknown")
    entry_type = pub.get("type", "misc")
    fields = dict(pub.get("fields", {}))

    lines = [f"@{entry_type}{{{key},"]

    # 1. person roles first (author, then editor) — both may appear in fields
    #    after parse_bibtex_file injects pybtex persons into pub['fields']
    if "author" in fields:
        _append_field(lines, "author", fields.pop("author"))
    if "editor" in fields:
        _append_field(lines, "editor", fields.pop("editor"))

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
    v = str(value).strip() if value is not None else ""
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
            fields = pub.get("fields", {})
            year_value = pub.get("year") or fields.get("year", "0")
            year = -int(str(year_value).strip())
        except (ValueError, TypeError):
            year = 0
        return (year, item[0])

    sorted_pubs = sorted(publications.items(), key=_sort_key)
    serialized = (serialize_bibtex_entry(pub) for _, pub in sorted_pubs)
    return "\n\n".join(serialized) + "\n"


def bibtex_text_to_publications(bibtex_text: str) -> Dict[str, Dict]:
    """Parse raw BibTeX text (not a file path) into a publications dict.

    Returns an empty dict if the text is empty or invalid.
    """
    text = (bibtex_text or "").strip()
    if not text:
        return {}

    try:
        bib_entries = _load_bibtex_entries(text)
    except (OSError, TypeError, ValueError):
        return {}

    publications = {}
    for entry in bib_entries:
        publication = _entry_to_publication(entry)
        publications[str(publication["key"])] = publication

    return publications
