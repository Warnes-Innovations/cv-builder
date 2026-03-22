#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Parse job descriptions to extract requirements, keywords, and qualifications.

Usage:
    python parse_job_description.py <job_file> --output <output_json>
    python parse_job_description.py --text "Job description text..."
"""

import argparse
import json
import re
from typing import Dict, List, Set, Tuple
from pathlib import Path


def parse_job_description(job_text: str) -> Dict:
    """
    Parse job description and extract structured information.
    
    Args:
        job_text: Full job description text
        
    Returns:
        Dictionary with extracted information:
        - title: Job title
        - company: Company name
        - keywords: Set of important keywords
        - required_skills: List of explicitly required skills
        - preferred_skills: List of preferred skills
        - requirements: List of requirement phrases
        - responsibilities: List of responsibility phrases
        - domain: Industry/domain context
        - experience_years: Required years of experience
        - education: Education requirements
    """
    result = {
        'title': extract_job_title(job_text),
        'company': extract_company_name(job_text),
        'keywords': list(extract_keywords(job_text)),
        'required_skills': extract_skills(job_text, required=True),
        'preferred_skills': extract_skills(job_text, required=False),
        'requirements': extract_requirements(job_text),
        'responsibilities': extract_responsibilities(job_text),
        'domain': identify_domain(job_text),
        'experience_years': extract_experience_years(job_text),
        'education': extract_education_requirements(job_text),
    }
    
    return result


def extract_job_title(text: str) -> str:
    """Extract job title from description."""
    # Look for common patterns
    patterns = [
        r'(?:position|role|title):\s*([^\n]+)',
        r'(?:job title|position title):\s*([^\n]+)',
        r'^([^\n]{10,80})\s*(?:position|role)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
    
    # Fallback: look for capitalized title-like text at beginning
    lines = text.strip().split('\n')
    if lines and len(lines[0]) < 100:
        return lines[0].strip()
    
    return 'Unknown Position'


def extract_company_name(text: str) -> str:
    """Extract company name from description."""
    patterns = [
        r'(?:company|organization):\s*([^\n]+)',
        r'(?:join|work (?:for|at|with))\s+([A-Z][A-Za-z\s&,]+?)(?:\s+(?:as|is|in|to|and))',
        r'^([A-Z][A-Za-z\s&,]{2,40})\s+is\s+(?:seeking|looking|hiring)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            company = match.group(1).strip()
            # Remove common trailing words
            company = re.sub(r'\s+(?:Inc|LLC|Ltd|Corp|Corporation)\.?$', '', company)
            return company
    
    return ''


def extract_keywords(text: str) -> Set[str]:
    """
    Extract important keywords including:
    - Programming languages
    - Technologies/frameworks
    - Domain-specific terms
    - Key methodologies
    """
    keywords = set()
    text_lower = text.lower()
    
    # Programming languages
    languages = [
        'python', 'r', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go',
        'rust', 'scala', 'julia', 'matlab', 'sas', 'sql', 'bash', 'shell'
    ]
    for lang in languages:
        if re.search(rf'\b{lang}\b', text_lower):
            keywords.add(lang)
    
    # Cloud platforms
    cloud_platforms = ['aws', 'azure', 'gcp', 'google cloud', 'cloud computing']
    for platform in cloud_platforms:
        if platform in text_lower:
            keywords.add(platform)
    
    # Data science / ML tools
    ds_tools = [
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
        'scipy', 'matplotlib', 'seaborn', 'jupyter', 'spark', 'hadoop',
        'tableau', 'power bi', 'looker', 'dbt'
    ]
    for tool in ds_tools:
        if tool.replace(' ', '') in text_lower.replace(' ', '').replace('-', ''):
            keywords.add(tool)
    
    # DevOps / Infrastructure
    devops = [
        'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible',
        'git', 'github', 'gitlab', 'bitbucket', 'jira'
    ]
    for tool in devops:
        if tool in text_lower:
            keywords.add(tool)
    
    # Databases
    databases = [
        'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'dynamodb', 'cassandra', 'oracle', 'sql server'
    ]
    for db in databases:
        if db.replace(' ', '') in text_lower.replace(' ', ''):
            keywords.add(db)
    
    # Methodologies
    methodologies = [
        'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'test-driven',
        'machine learning', 'deep learning', 'nlp', 'computer vision',
        'data analysis', 'statistical modeling', 'a/b testing'
    ]
    for method in methodologies:
        if method in text_lower:
            keywords.add(method)
    
    # Extract frequently mentioned capitalized terms
    cap_terms = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
    term_counts = {}
    for term in cap_terms:
        term_counts[term] = term_counts.get(term, 0) + 1
    
    # Add terms mentioned 2+ times
    for term, count in term_counts.items():
        if count >= 2 and len(term) > 3:
            keywords.add(term.lower())
    
    return keywords


def extract_skills(text: str, required: bool = True) -> List[str]:
    """
    Extract required or preferred skills from job description.
    
    Args:
        text: Job description text
        required: If True, extract required skills; if False, extract preferred
        
    Returns:
        List of skills
    """
    skills = []
    
    # Find relevant sections
    if required:
        section_patterns = [
            r'(?:required|must have|requirements?):\s*(.*?)(?:\n\n|preferred|nice to have|$)',
            r'(?:qualifications?):\s*(.*?)(?:\n\n|preferred|$)',
        ]
    else:
        section_patterns = [
            r'(?:preferred|nice to have|bonus):\s*(.*?)(?:\n\n|required|$)',
            r'(?:desired|ideal candidate):\s*(.*?)(?:\n\n|required|$)',
        ]
    
    section_text = ''
    for pattern in section_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            section_text += match.group(1) + '\n'
    
    if not section_text:
        # Fallback: use entire text
        section_text = text
    
    # Extract bullet points and numbered lists
    bullet_pattern = r'[•\-\*]\s*([^\n]+)'
    numbered_pattern = r'\d+[\.)]\s*([^\n]+)'
    
    for pattern in [bullet_pattern, numbered_pattern]:
        matches = re.findall(pattern, section_text)
        skills.extend([m.strip() for m in matches if len(m) > 10])
    
    return skills


def extract_requirements(text: str) -> List[str]:
    """Extract list of requirements/qualifications."""
    requirements = []
    
    # Find requirements section
    req_section = re.search(
        r'(?:requirements?|qualifications?):\s*(.*?)(?:\n\n|responsibilities|preferred)',
        text,
        re.IGNORECASE | re.DOTALL
    )
    
    if req_section:
        section_text = req_section.group(1)
    else:
        section_text = text
    
    # Extract bullet points
    bullets = re.findall(r'[•\-\*]\s*([^\n]+)', section_text)
    requirements.extend([b.strip() for b in bullets if len(b) > 15])
    
    # Extract numbered items
    numbered = re.findall(r'\d+[\.)]\s*([^\n]+)', section_text)
    requirements.extend([n.strip() for n in numbered if len(n) > 15])
    
    return requirements[:15]  # Limit to top 15


def extract_responsibilities(text: str) -> List[str]:
    """Extract job responsibilities."""
    responsibilities = []
    
    # Find responsibilities section
    resp_section = re.search(
        r'(?:responsibilities|duties|you will):\s*(.*?)(?:\n\n|requirements|qualifications)',
        text,
        re.IGNORECASE | re.DOTALL
    )
    
    if resp_section:
        section_text = resp_section.group(1)
    else:
        # Look for sentences with action verbs
        section_text = text
    
    # Extract bullet points
    bullets = re.findall(r'[•\-\*]\s*([^\n]+)', section_text)
    responsibilities.extend([b.strip() for b in bullets if len(b) > 15])
    
    # Extract numbered items
    numbered = re.findall(r'\d+[\.)]\s*([^\n]+)', section_text)
    responsibilities.extend([n.strip() for n in numbered if len(n) > 15])
    
    return responsibilities[:10]  # Limit to top 10


def identify_domain(text: str) -> str:
    """Identify the industry/domain from job description."""
    text_lower = text.lower()
    
    domains = {
        'bioinformatics': ['bioinformatics', 'computational biology', 'genomics', 'proteomics', 'ngs'],
        'healthcare': ['healthcare', 'medical', 'clinical', 'pharma', 'health'],
        'finance': ['finance', 'banking', 'trading', 'fintech', 'investment'],
        'e-commerce': ['e-commerce', 'retail', 'marketplace', 'online shopping'],
        'data_science': ['data science', 'machine learning', 'ai', 'analytics'],
        'software_engineering': ['software engineering', 'software development', 'backend', 'frontend'],
        'devops': ['devops', 'infrastructure', 'cloud engineering', 'sre'],
        'cybersecurity': ['cybersecurity', 'security', 'infosec', 'penetration testing'],
    }
    
    scores = {}
    for domain, keywords in domains.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[domain] = score
    
    if scores:
        return max(scores.items(), key=lambda x: x[1])[0]
    
    return 'general'


def extract_experience_years(text: str) -> int:
    """Extract required years of experience."""
    # Look for patterns like "5+ years", "3-5 years", "at least 7 years"
    patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience',
        r'(?:minimum|at least)\s+(\d+)\s+years?',
        r'(\d+)-\d+\s+years?',
    ]
    
    years = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        years.extend([int(m) for m in matches])
    
    return max(years) if years else 0


def extract_education_requirements(text: str) -> str:
    """Extract education requirements."""
    edu_keywords = {
        'phd': ['phd', 'ph.d', 'doctorate', 'doctoral'],
        'masters': ['masters', 'master\'s', 'm.s.', 'msc'],
        'bachelors': ['bachelors', 'bachelor\'s', 'b.s.', 'bs', 'ba', 'b.a.'],
    }
    
    text_lower = text.lower()
    
    for level, keywords in edu_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                # Check if it says "required" nearby
                context = text_lower[max(0, text_lower.find(kw)-50):text_lower.find(kw)+50]
                if 'required' in context or 'must' in context:
                    return level + '_required'
                else:
                    return level + '_preferred'
    
    return 'not_specified'


def main():
    """Command-line interface."""
    parser = argparse.ArgumentParser(
        description='Parse job descriptions to extract requirements and keywords.'
    )
    parser.add_argument(
        'input',
        nargs='?',
        help='Path to job description file (txt, md, or json)'
    )
    parser.add_argument(
        '--text',
        help='Job description text directly'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output JSON file path (default: stdout)'
    )
    parser.add_argument(
        '--pretty',
        action='store_true',
        help='Pretty-print JSON output'
    )
    
    args = parser.parse_args()
    
    # Get job description text
    if args.text:
        job_text = args.text
    elif args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"Error: File not found: {args.input}")
            return 1
        
        job_text = input_path.read_text(encoding='utf-8')
    else:
        print("Error: Provide either --text or input file")
        parser.print_help()
        return 1
    
    # Parse job description
    result = parse_job_description(job_text)
    
    # Format output
    if args.pretty:
        json_output = json.dumps(result, indent=2)
    else:
        json_output = json.dumps(result)
    
    # Write output
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_output, encoding='utf-8')
        print(f"Parsed job description saved to: {args.output}")
    else:
        print(json_output)
    
    return 0


if __name__ == '__main__':
    exit(main())
