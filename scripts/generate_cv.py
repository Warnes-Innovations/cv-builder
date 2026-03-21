#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Generate customized CV from Master_CV_Data.json based on job description.

Usage:
    python generate_cv.py <job_description.json> --output cv_output
    python generate_cv.py --job-file job.txt --format docx --format pdf
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
import sys

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import get_config
from utils.bibtex_parser import parse_bibtex_file, format_publication, filter_publications
from utils.master_data_validator import validate_master_data_file
from utils.scoring import (
    calculate_relevance_score,
    rank_content,
    select_best_summary,
    calculate_skill_score
)
from utils.template_renderer import create_cv_context
from parse_job_description import parse_job_description


def load_master_data(filepath: str) -> Dict:
    """Load Master_CV_Data.json"""
    validation = validate_master_data_file(filepath, use_schema=True)
    if not validation.valid:
        msg = "; ".join(validation.errors) or "master data validation failed"
        raise ValueError(f"Master data validation failed before load: {msg}")

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def select_content(
    master_data: Dict,
    job_data: Dict,
    max_skills: int = 20,
    max_achievements: int = 5,
    max_publications: int = 10
) -> Dict:
    """
    Select and rank CV content based on job requirements.
    
    Args:
        master_data: Full Master_CV_Data.json
        job_data: Parsed job description
        max_skills: Maximum skills to include
        max_achievements: Maximum achievements to include
        max_publications: Maximum publications to include
        
    Returns:
        Dictionary with selected content
    """
    job_keywords = set(job_data.get('keywords', []))
    job_requirements = job_data.get('requirements', [])
    domain = job_data.get('domain', '')
    
    print(f"Job Analysis:")
    print(f"  Keywords: {len(job_keywords)} found")
    print(f"  Requirements: {len(job_requirements)} found")
    print(f"  Domain: {domain}")
    print(f"  Experience: {job_data.get('experience_years', 0)} years")
    print()
    
    # Select professional summary
    summaries = master_data.get('professional_summaries', [])
    selected_summary = select_best_summary(
        summaries,
        job_keywords,
        job_data.get('title', '')
    )
    print(f"Selected summary: {selected_summary.get('audience', ['general'])[0] if selected_summary else 'default'}")
    
    # Rank and select experiences
    experiences = master_data.get('experience', [])
    ranked_experiences = rank_content(
        experiences,
        job_keywords,
        job_requirements,
        domain,
    )
    
    selected_experiences = []
    for exp, score in ranked_experiences:
        print(f"  Experience: {exp.get('title', '')} at {exp.get('company', '')} - Score: {score:.1f}")
        
        # Filter achievements within experience
        achievements = exp.get('achievements', [])
        if achievements and isinstance(achievements[0], dict):
            # Rank achievements
            ranked_ach = rank_content(
                achievements,
                job_keywords,
                job_requirements,
                domain,
                top_n=5  # Max 5 achievements per experience
            )
            exp_copy = exp.copy()
            exp_copy['achievements'] = [ach for ach, _ in ranked_ach]
            selected_experiences.append(exp_copy)
        else:
            selected_experiences.append(exp)
    
    print()
    
    # Rank and select skills
    skills = master_data.get('skills', [])
    required_skills = job_data.get('required_skills', []) + job_data.get('preferred_skills', [])
    
    scored_skills = []
    for skill in skills:
        score = calculate_skill_score(skill, job_keywords, required_skills)
        scored_skills.append((skill, score))
    
    scored_skills.sort(key=lambda x: x[1], reverse=True)
    selected_skills = [skill for skill, score in scored_skills[:max_skills]]
    
    print(f"Selected {len(selected_skills)} skills:")
    for skill, score in scored_skills[:10]:
        print(f"  {skill.get('name', '')} - Score: {score:.1f}")
    print()
    
    # Select achievements
    achievements = master_data.get('selected_achievements', [])
    ranked_achievements = rank_content(
        achievements,
        job_keywords,
        job_requirements,
        domain,
        top_n=max_achievements
    )
    selected_achievements = [ach for ach, score in ranked_achievements]
    
    print(f"Selected {len(selected_achievements)} key achievements")
    print()
    
    return {
        'summary': selected_summary,
        'experiences': selected_experiences,
        'skills': selected_skills,
        'achievements': selected_achievements,
        'education': master_data.get('education', []),
        'awards': master_data.get('awards', []),
    }


def select_publications(
    publications_file: str,
    job_data: Dict,
    max_count: int = 10
) -> List[Dict]:
    """
    Select most relevant publications for the job.
    
    Args:
        publications_file: Path to publications.bib
        job_data: Parsed job description
        max_count: Maximum publications to include
        
    Returns:
        List of formatted publication strings
    """
    if not Path(publications_file).exists():
        print(f"Warning: Publications file not found: {publications_file}")
        return []
    
    publications = parse_bibtex_file(publications_file)
    domain = job_data.get('domain', '')
    keywords = set(job_data.get('keywords', []))
    
    # Score publications by relevance
    scored_pubs = []
    for key, pub in publications.items():
        score = 0.0
        
        # Recent publications get higher scores
        try:
            year = int(pub['year'])
            if year >= 2020:
                score += 30
            elif year >= 2015:
                score += 20
            elif year >= 2010:
                score += 10
            elif year >= 2005:
                score += 5
        except (ValueError, KeyError):
            pass
        
        # Journal articles score higher than software
        if pub['type'] == 'article':
            score += 25
        elif pub['type'] in ['inproceedings', 'conference']:
            score += 20
        elif pub['type'] == 'misc':
            score += 10
        
        # Check for keyword matches in title
        title_lower = pub['title'].lower()
        title_keywords = set(title_lower.split())
        matches = keywords.intersection(title_keywords)
        score += len(matches) * 5
        
        # Domain-specific boosts
        if domain == 'bioinformatics':
            if any(term in title_lower for term in ['genom', 'gene', 'bioinformatics', 'dna', 'rna']):
                score += 15
        elif domain == 'data_science':
            if any(term in title_lower for term in ['analysis', 'statistical', 'data', 'machine learning']):
                score += 15
        elif domain == 'software_engineering':
            if pub['type'] == 'misc' and 'package' in pub.get('note', '').lower():
                score += 15
        
        scored_pubs.append((pub, score))
    
    # Sort and select top publications
    scored_pubs.sort(key=lambda x: x[1], reverse=True)
    
    selected = []
    for pub, score in scored_pubs[:max_count]:
        formatted = format_publication(pub, style='brief')
        selected.append({
            'formatted': formatted,
            'year': pub['year'],
            'type': pub['type'],
            'score': score
        })
    
    print(f"Selected {len(selected)} publications:")
    for pub in selected[:5]:
        print(f"  {pub['formatted'][:80]}... - Score: {pub['score']:.1f}")
    print()
    
    return selected


def generate_cv_data(
    master_data_file: str,
    publications_file: str,
    job_data: Dict,
    output_dir: str
) -> Dict:
    """
    Generate CV data structure ready for formatting.
    
    Args:
        master_data_file: Path to Master_CV_Data.json
        publications_file: Path to publications.bib
        job_data: Parsed job description
        output_dir: Output directory for generated files
        
    Returns:
        Complete CV data structure
    """
    # Load master data
    master_data = load_master_data(master_data_file)
    
    # Select content
    selected = select_content(master_data, job_data)
    
    # Select publications
    publications = select_publications(publications_file, job_data)
    
    # Create full CV context
    cv_data = {
        'personal_info': master_data.get('personal_info', {}),
        'job_info': {
            'title': job_data.get('title', ''),
            'company': job_data.get('company', ''),
            'domain': job_data.get('domain', ''),
        },
        'summary': selected['summary'],
        'experiences': selected['experiences'],
        'skills': selected['skills'],
        'achievements': selected['achievements'],
        'education': selected['education'],
        'publications': publications,
        'awards': selected['awards'],
    }
    
    # Save CV data
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    cv_data_file = output_path / 'cv_data.json'
    with open(cv_data_file, 'w', encoding='utf-8') as f:
        json.dump(cv_data, f, indent=2)
    
    print(f"CV data saved to: {cv_data_file}")
    
    return cv_data


def main():
    """Command-line interface."""
    config = get_config()
    
    parser = argparse.ArgumentParser(
        description='Generate customized CV from master data based on job description.'
    )
    parser.add_argument(
        'job_description',
        nargs='?',
        help='Path to parsed job description JSON (from parse_job_description.py)'
    )
    parser.add_argument(
        '--job-file',
        help='Path to raw job description text file (will be parsed automatically)'
    )
    parser.add_argument(
        '--master-data',
        default=None,
        help=f'Path to Master_CV_Data.json (default: {config.master_cv_path})'
    )
    parser.add_argument(
        '--publications',
        default=None,
        help=f'Path to publications.bib (default: {config.publications_path})'
    )
    parser.add_argument(
        '--output', '-o',
        default=None,
        help=f'Output directory (default: {config.output_dir})'
    )
    parser.add_argument(
        '--max-experiences',
        type=int,
        default=4,
        help='Maximum experience entries (default: 4)'
    )
    parser.add_argument(
        '--max-skills',
        type=int,
        default=20,
        help='Maximum skills to include (default: 20)'
    )
    parser.add_argument(
        '--max-publications',
        type=int,
        default=10,
        help='Maximum publications (default: 10)'
    )
    
    args = parser.parse_args()
    
    # Resolve config values
    master_data = args.master_data or config.master_cv_path
    publications = args.publications or config.publications_path
    output_dir = args.output or config.output_dir
    
    # Get job data
    if args.job_file:
        # Parse raw job description
        job_text = Path(args.job_file).read_text(encoding='utf-8')
        job_data = parse_job_description(job_text)
        
        # Save parsed job data
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        job_data_file = output_path / 'job_description.json'
        with open(job_data_file, 'w', encoding='utf-8') as f:
            json.dump(job_data, f, indent=2)
        print(f"Parsed job description saved to: {job_data_file}\n")
    elif args.job_description:
        # Load pre-parsed job data
        with open(args.job_description, 'r', encoding='utf-8') as f:
            job_data = json.load(f)
    else:
        print("Error: Provide either job_description JSON or --job-file")
        parser.print_help()
        return 1
    
    # Generate CV
    print(f"Generating CV for: {job_data.get('title', 'Unknown Position')}")
    if job_data.get('company'):
        print(f"Company: {job_data['company']}")
    print()
    
    cv_data = generate_cv_data(
        master_data,
        publications,
        job_data,
        output_dir
    )
    
    print("\n✓ CV generation complete!")
    print(f"  Output directory: {output_dir}")
    print(f"  Next steps:")
    print(f"    1. Review cv_data.json")
    print(f"    2. Generate DOCX: python generate_docx.py {output_dir}/cv_data.json")
    print(f"    3. Generate PDF: python generate_pdf.py {output_dir}/cv_data.json")
    
    return 0


if __name__ == '__main__':
    exit(main())
