# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Template rendering utilities using Jinja2.
"""

import json
import os
import re
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

from jinja2 import Environment, FileSystemLoader, Template, select_autoescape
from markupsafe import Markup


_SAFE_CSS_SIZE_RE = re.compile(r'^\d+(?:\.\d+)?(?:px|pt|rem|em|%)$')


def json_script(value: Any) -> Markup:
    """Serialize JSON for safe embedding inside a script tag."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            pass

    if isinstance(value, str):
        serialized = value
    else:
        serialized = json.dumps(value, indent=2, ensure_ascii=False)

    serialized = (
        serialized
        .replace('<', '\\u003c')
        .replace('>', '\\u003e')
        .replace('&', '\\u0026')
        .replace("'", '\\u0027')
    )
    return Markup(serialized)


def safe_url(value: Any) -> str:
    """Allow only http/https URLs in rendered href attributes."""
    url = str(value or '').strip()
    if not url:
        return ''

    parsed = urlsplit(url)
    if parsed.scheme not in {'http', 'https'}:
        return ''
    if not parsed.netloc:
        return ''
    return url


def safe_css_size(value: Any, default: str = '10px') -> str:
    """Return a conservative CSS size token for inline style usage."""
    text = str(value or '').strip().lower()
    if text.isdigit():
        return f'{text}px'
    if _SAFE_CSS_SIZE_RE.fullmatch(text):
        return text
    return default


def load_template(template_path: str) -> Template:
    """
    Load a Jinja2 template from file.
    
    Args:
        template_path: Path to template file
        
    Returns:
        Jinja2 Template object
    """
    template_dir = os.path.dirname(template_path)
    template_name = os.path.basename(template_path)
    
    env = Environment(
        loader=FileSystemLoader(template_dir if template_dir else '.'),
        trim_blocks=True,
        lstrip_blocks=True,
        autoescape=select_autoescape(
            enabled_extensions=('html', 'htm', 'xml'),
            default_for_string=False,
        ),
    )

    # Add custom filters
    env.filters['format_date'] = format_date
    env.filters['format_phone'] = format_phone
    env.filters['escape_latex'] = escape_latex
    env.filters['json_script'] = json_script
    env.filters['safe_url'] = safe_url
    env.filters['safe_css_size'] = safe_css_size

    return env.get_template(template_name)


def render_template(
    template: Template,
    context: Dict[str, Any],
    output_path: Optional[str] = None
) -> str:
    """
    Render a Jinja2 template with given context.
    
    Args:
        template: Jinja2 Template object
        context: Dictionary of template variables
        output_path: Optional path to write rendered output
        
    Returns:
        Rendered template string
    """
    rendered = template.render(**context)
    
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(rendered)
    
    return rendered


def format_date(date_str: str, format: str = 'short') -> str:
    """
    Format date string for display.
    
    Args:
        date_str: Date in YYYY-MM format or "Present"
        format: 'short' (MMM YYYY) or 'long' (Month YYYY)
        
    Returns:
        Formatted date string
    """
    if not date_str or date_str.lower() == 'present':
        return 'Present'
    
    try:
        parts = date_str.split('-')
        if len(parts) == 2:
            year, month = parts
            month_names_short = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ]
            month_names_long = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]
            
            month_idx = int(month) - 1
            if 0 <= month_idx < 12:
                if format == 'long':
                    return f"{month_names_long[month_idx]} {year}"
                else:
                    return f"{month_names_short[month_idx]} {year}"
    except (ValueError, IndexError):
        pass
    
    return date_str


def format_phone(phone: str) -> str:
    """
    Format phone number for display.
    
    Args:
        phone: Phone number string
        
    Returns:
        Formatted phone (xxx) xxx-xxxx
    """
    # Remove non-digits
    digits = ''.join(c for c in phone if c.isdigit())
    
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits[0] == '1':
        return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    
    return phone


def escape_latex(text: str) -> str:
    """
    Escape special LaTeX characters.
    
    Args:
        text: Input text
        
    Returns:
        LaTeX-escaped text
    """
    replacements = {
        '\\': r'\textbackslash{}',  # must be processed first to avoid double-escaping
        '&':  r'\&',
        '%':  r'\%',
        '$':  r'\$',
        '#':  r'\#',
        '_':  r'\_',
        '{':  r'\{',
        '}':  r'\}',
        '~':  r'\textasciitilde{}',
        '^':  r'\^{}',
    }
    
    result = text
    for char, escaped in replacements.items():
        result = result.replace(char, escaped)
    
    return result


def create_cv_context(
    master_data: Dict,
    selected_experiences: list,
    selected_skills: list,
    selected_achievements: list,
    publications: list,
    summary: Dict,
    job_title: str = ''
) -> Dict[str, Any]:
    """
    Create template context dictionary for CV generation.
    
    Args:
        master_data: Full Master_CV_Data.json
        selected_experiences: Filtered/ranked experience entries
        selected_skills: Filtered/ranked skills
        selected_achievements: Filtered/ranked achievements
        publications: Selected publications
        summary: Selected professional summary
        job_title: Target job title (optional)
        
    Returns:
        Dictionary ready for template rendering
    """
    personal_info = master_data.get('personal_info', {})
    contact = personal_info.get('contact', {})
    
    context = {
        # Personal information
        'name': personal_info.get('name', ''),
        'title': job_title or personal_info.get('title', ''),
        'email': contact.get('email', ''),
        'phone': contact.get('phone', ''),
        'linkedin': contact.get('linkedin', ''),
        'github': contact.get('github', ''),
        'website': contact.get('website', ''),
        'location': _format_location(personal_info.get('address', {})),
        
        # Professional summary
        'summary': summary.get('summary', ''),
        
        # Experience
        'experiences': selected_experiences,
        
        # Skills (group by category if available)
        'skills': _group_skills(selected_skills),
        'skills_flat': selected_skills,
        
        # Achievements
        'achievements': selected_achievements,
        
        # Education
        'education': master_data.get('education', []),
        
        # Publications
        'publications': publications,
        
        # Awards
        'awards': master_data.get('awards', []),
    }
    
    return context


def _format_location(address: Dict) -> str:
    """Format address for display."""
    parts = []
    
    if address.get('city'):
        parts.append(address['city'])
    if address.get('state'):
        parts.append(address['state'])
    
    if parts:
        return ', '.join(parts)
    
    return ''


def _group_skills(skills: list) -> Dict[str, list]:
    """Group skills by category."""
    grouped = {}
    
    for skill in skills:
        category = skill.get('category', 'Other')
        if category not in grouped:
            grouped[category] = []
        grouped[category].append(skill)
    
    return grouped
