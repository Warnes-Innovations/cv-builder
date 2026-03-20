"""
CV Orchestrator - Bridges LLM intelligence with document generation utilities.

This module coordinates between:
- LLM-driven content selection
- Traditional utility functions (scoring, formatting)
- Document generation (DOCX/PDF)
"""

import copy
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import subprocess
import weasyprint
from collections import defaultdict

# Import existing utilities
from .scoring import (
    calculate_relevance_score,
    calculate_skill_score
)
from .bibtex_parser import parse_bibtex_file, format_publication
from .config import get_config
from .llm_client import LLMClient


class CVOrchestrator:
    """Orchestrates CV generation with LLM + utilities."""
    
    def __init__(
        self,
        master_data_path: str,
        publications_path: str,
        output_dir: str,
        llm_client: LLMClient
    ):
        self.master_data_path = Path(master_data_path).expanduser()
        self.publications_path = Path(publications_path).expanduser()
        self.output_dir = Path(output_dir).expanduser()
        self.llm = llm_client
        
        # Load master data
        self.master_data = self._load_master_data()

        # Load publications if available
        self.publications = {}
        if self.publications_path.exists():
            self.publications = parse_bibtex_file(str(self.publications_path))

        # Load synonym map for ATS skill normalisation
        self._synonym_map: Dict[str, str] = self._load_synonym_map()
        # Full expansion index: any form (lower) -> canonical
        self._expansion_index: Dict[str, str] = {}
        for alias, canonical in self._synonym_map.items():
            if alias.startswith('_'):  # skip comment keys
                continue
            self._expansion_index[alias.lower()] = canonical
            self._expansion_index[canonical.lower()] = canonical
    
    def _load_master_data(self) -> Dict:
        """Load Master_CV_Data.json."""
        if not self.master_data_path.exists():
            raise FileNotFoundError(
                f"Master data file not found: {self.master_data_path}\n"
                "Please create Master_CV_Data.json first."
            )
        
        with open(self.master_data_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_synonym_map(self) -> Dict[str, str]:
        """Load scripts/data/synonym_map.json, returning {} gracefully if missing."""
        map_path = Path(__file__).parent.parent / 'data' / 'synonym_map.json'
        if not map_path.exists():
            return {}
        try:
            with open(map_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {k: v for k, v in data.items() if not k.startswith('_')}
        except Exception:
            return {}

    def canonical_skill_name(self, name: str) -> str:
        """Return the canonical form of a skill name using the synonym map.

        Examples: 'ML' -> 'Machine Learning', 'sklearn' -> 'scikit-learn'.
        Unknown names are returned unchanged.
        """
        return self._expansion_index.get(name.lower(), name)

    def _prepare_cv_data_for_template(
        self,
        selected_content: Dict,
        job_analysis: Dict,
        template_variant: str = 'standard'
    ) -> Dict:
        """Prepare CV data in the format expected by the HTML resume template."""

        # Work on copies so template-specific normalization never mutates the
        # session's selected content in place.
        personal_info = copy.deepcopy(selected_content.get('personal_info', {}))

        # Validate contact information
        contact = personal_info.get('contact', {})
        address = contact.get('address', {})
        if address:
            address_display = f"{address.get('city', '')}, {address.get('state', '')}"
            address_display = address_display.strip(', ')
            contact['address_display'] = address_display
        
        # Ensure languages key exists (template expects it)
        if 'languages' not in personal_info:
            personal_info['languages'] = []
        else:
            personal_info['languages'] = self._normalize_language_entries(
                personal_info.get('languages', [])
            )

        # Get professional summary
        professional_summary = selected_content.get('summary', '')
        if not professional_summary.strip():
            professional_summary = f"Experienced professional applying for {job_analysis.get('title', 'position')}"
        
        # Format skills by category
        skills_by_category = self._organize_skills_by_category(
            selected_content.get('skills', []), 
            template_variant
        )
        
        # Format publications
        publications = self._format_publications(selected_content.get('publications', []))

        experiences = self._normalize_experiences_for_template(
            copy.deepcopy(selected_content.get('experiences', []))
        )
        achievements = self._normalize_achievement_entries(
            copy.deepcopy(selected_content.get('achievements', []))
        )

        # Get awards and certifications
        awards = selected_content.get('awards', [])
        certifications = selected_content.get('certifications', [])
        
        # Add template metadata
        template_metadata = {
            'variant': template_variant,
            'generated_date': datetime.now().isoformat(),
            'job_title': job_analysis.get('title', ''),
            'company': job_analysis.get('company', ''),
            'total_publications_count': len(self.publications) if self.publications else 0,
        }
        
        cv_data = {
            'personal_info': personal_info,
            'professional_summary': professional_summary,
            'experiences': experiences,
            'achievements': achievements,
            'education': selected_content.get('education', []),
            'skills_by_category': skills_by_category,
            'awards': awards,
            'certifications': certifications,
            'publications': publications,
            'template_metadata': template_metadata
        }

        return cv_data

    @staticmethod
    def _extract_display_text(item: Any, preferred_fields: Optional[List[str]] = None) -> str:
        """Extract the best human-readable text from a template item."""
        if item is None:
            return ''
        if isinstance(item, str):
            return item.strip()
        if not isinstance(item, dict):
            return str(item).strip()

        field_order = preferred_fields or []
        fallback_fields = [
            'text',
            'description',
            'summary',
            'formatted',
            'formatted_citation',
            'title',
            'name',
            'degree',
            'institution',
            'language',
            'value',
        ]

        for field_name in field_order + fallback_fields:
            value = item.get(field_name)
            if isinstance(value, str) and value.strip():
                return value.strip()

        return ''

    def _normalize_achievement_entries(self, achievements: List[Any]) -> List[Any]:
        """Ensure achievement-like entries always expose a human-readable ``text``."""
        normalized = []
        for achievement in achievements or []:
            if isinstance(achievement, dict):
                entry = dict(achievement)
                entry['text'] = self._extract_display_text(
                    entry,
                    preferred_fields=['text', 'description', 'summary', 'title', 'name'],
                )
                normalized.append(entry)
            else:
                normalized.append(achievement)
        return normalized

    def _normalize_experiences_for_template(self, experiences: List[Any]) -> List[Any]:
        """Normalize experience achievement payloads before template rendering."""
        normalized = []
        for experience in experiences or []:
            if not isinstance(experience, dict):
                normalized.append(experience)
                continue

            entry = dict(experience)
            for key in ('ordered_achievements', 'achievements'):
                if isinstance(entry.get(key), list):
                    entry[key] = self._normalize_achievement_entries(entry.get(key, []))
            normalized.append(entry)
        return normalized

    def _normalize_language_entries(self, languages: List[Any]) -> List[str]:
        """Convert language records to simple display strings for the template."""
        normalized = []
        for language in languages or []:
            if isinstance(language, dict):
                name = self._extract_display_text(
                    language,
                    preferred_fields=['language', 'name'],
                )
                proficiency = str(language.get('proficiency', '')).strip()
                if name and proficiency:
                    normalized.append(f"{name} ({proficiency})")
                elif name:
                    normalized.append(name)
            else:
                text = str(language).strip()
                if text:
                    normalized.append(text)
        return normalized

    def _organize_skills_by_category(self, skills: List[Dict], variant: str) -> List[Dict]:
        """Organize skills by category, deduplicating by canonical synonym name."""
        if not skills:
            return []

        # Deduplicate within the full list by canonical name.
        # If 'ML' and 'Machine Learning' both appear, merge them: keep the one
        # with more years and collect aliases from the other.
        canonical_seen: Dict[str, Dict] = {}  # canonical_lower -> merged skill dict
        for skill in skills:
            name = skill.get('name', '')
            canonical = self.canonical_skill_name(name)
            key = canonical.lower()
            if key not in canonical_seen:
                merged = dict(skill)
                merged['name'] = canonical if canonical != name else name
                merged.setdefault('aliases', list(skill.get('aliases') or []))
                if canonical != name and name not in merged['aliases']:
                    merged['aliases'].append(name)
                canonical_seen[key] = merged
            else:
                existing = canonical_seen[key]
                # Keep the entry with more years; add the other name as alias
                if skill.get('years', 0) > existing.get('years', 0):
                    alias_name = existing.get('name', '')
                    existing.update({k: v for k, v in skill.items() if k != 'aliases'})
                    existing['name'] = canonical
                    existing.setdefault('aliases', [])
                    if alias_name and alias_name not in existing['aliases']:
                        existing['aliases'].append(alias_name)
                else:
                    existing.setdefault('aliases', [])
                    if name and name not in existing['aliases'] and name != existing['name']:
                        existing['aliases'].append(name)

        deduped_skills = list(canonical_seen.values())

        category_skills: Dict[str, List[Dict]] = defaultdict(list)
        for skill in deduped_skills:
            category = skill.get('category', 'General')
            category_skills[category].append(skill)

        # Define category priority
        priority_orders = {
            'standard': ['Core Expertise', 'Programming', 'Technical', 'Tools', 'General'],
            'technical': ['Programming', 'Technical', 'Tools', 'Core Expertise', 'General'],
            'academic': ['Research', 'Technical', 'Programming', 'Core Expertise', 'General']
        }

        priority_order = priority_orders.get(variant, priority_orders['standard'])

        sorted_categories = []

        # Add priority categories first
        for category in priority_order:
            if category in category_skills:
                skills_list = sorted(category_skills[category],
                                     key=lambda x: (-x.get('years', 0), x.get('name', '')))
                sorted_categories.append({
                    'category': category,
                    'skills': skills_list
                })

        # Add remaining categories alphabetically
        remaining_categories = sorted(set(category_skills.keys()) - set(priority_order))
        for category in remaining_categories:
            skills_list = sorted(category_skills[category],
                                 key=lambda x: (-x.get('years', 0), x.get('name', '')))
            sorted_categories.append({
                'category': category,
                'skills': skills_list
            })

        return sorted_categories
    
    def _format_publications(self, publications: List) -> List[Dict]:
        """Format publications for template consumption."""
        owner_name = self.master_data.get('personal_info', {}).get('name', '') if self.master_data else ''
        # Extract last name: handle "Last, First" (BibTeX/comma style) and "First Last" (natural)
        if ',' in owner_name:
            owner_last = owner_name.split(',')[0].strip().lower()
        else:
            owner_last = owner_name.strip().split()[-1].lower() if owner_name.strip() else ''

        formatted_pubs = []
        for pub in publications:
            if isinstance(pub, dict):
                entry: Dict[str, Any] = {}
                if 'formatted' in pub:
                    entry['formatted_citation'] = pub['formatted']
                elif 'title' in pub:
                    authors = pub.get('authors', 'Unknown')
                    title = pub.get('title', '')
                    journal = pub.get('journal', '')
                    year = pub.get('year', '')
                    citation = f"{authors}. {title}. {journal} ({year}).".strip()
                    entry['formatted_citation'] = citation
                else:
                    continue

                # Detect first authorship: compare owner last name against leading author token
                if owner_last:
                    raw_authors = pub.get('authors', '')
                    first_token = raw_authors.split(',')[0].strip().lower() if raw_authors else ''
                    entry['is_first_author'] = bool(first_token and owner_last in first_token)
                else:
                    entry['is_first_author'] = False

                formatted_pubs.append(entry)
        return formatted_pubs
    
    def render_html_preview(
        self,
        job_analysis: Dict,
        customizations: Dict,
        approved_rewrites: Optional[List[Dict]] = None,
        spell_audit: Optional[List[Dict]] = None,
        max_skills: Optional[int] = None,
        template_variant: str = 'standard',
    ) -> str:
        """Render CV as HTML for preview without generating PDF or DOCX.

        Called by the staged generation workflow (GAP-20) to produce the
        preview artifact that the layout-review loop works against.  Does not
        write any files; returns the raw HTML string.

        Parameters mirror ``generate_cv`` but only the HTML rendering path is
        executed, so this is significantly faster than a full generation run.
        """
        selected_content = self.build_render_ready_content(
            job_analysis,
            customizations,
            approved_rewrites=approved_rewrites,
            spell_audit=spell_audit,
            max_skills=max_skills,
        )
        cv_data = self._prepare_cv_data_for_template(
            selected_content, job_analysis, template_variant
        )
        cv_data['achievements'] = selected_content.get('achievements', [])
        cv_data['json_ld_str'] = self._build_json_ld(cv_data, job_analysis)

        template_dir = Path(__file__).parent.parent.parent / 'templates'
        template_file = template_dir / 'cv-template.html'
        if not template_file.exists():
            raise FileNotFoundError(f"HTML template not found: {template_file}")

        from .template_renderer import load_template, render_template  # noqa: PLC0415
        template = load_template(str(template_file))
        return render_template(template, cv_data)

    def generate_final_from_confirmed_html(
        self,
        confirmed_html: str,
        output_dir: Path,
        filename_base: str = "CV_final",
    ) -> Dict:
        """Write confirmed HTML to disk and regenerate the human-readable PDF.

        Called by ``POST /api/cv/generate-final`` after layout confirmation.
        The confirmed HTML (which may have had layout instructions applied) is
        written to ``output_dir/{filename_base}.html`` and converted to a PDF
        via WeasyPrint.  ATS DOCX is not regenerated here because it is derived
        from structured data, not from HTML layout.

        Returns:
            dict with keys ``html`` and ``pdf`` (absolute path strings).
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        html_path = output_dir / f"{filename_base}.html"
        html_path.write_text(confirmed_html, encoding="utf-8")

        pdf_path = output_dir / f"{filename_base}.pdf"
        self._convert_html_to_pdf(html_path, pdf_path)

        return {
            "html": str(html_path),
            "pdf":  str(pdf_path),
        }

    def _render_cv_html_pdf(
        self,
        cv_data: Dict,
        output_dir: Path,
        filename_base: str,
        template_variant: str = 'standard'
    ) -> Path:
        """Render CV using the Jinja2 HTML template and convert to PDF.

        Uses `templates/cv-template.html` with the `cv_data` dictionary
        produced by ``_prepare_cv_data_for_template``. The rendered HTML is
        written to `output_dir` and then converted to PDF via WeasyPrint.

        Returns a 2-tuple ``(html_output, pdf_output)``.
        """
        
        # Get templates directory and template file
        template_dir = Path(__file__).parent.parent.parent / 'templates'
        template_file = template_dir / 'cv-template.html'
        
        if not template_file.exists():
            raise FileNotFoundError(f"HTML template not found: {template_file}")
        
        # Render using Jinja2
        from .template_renderer import load_template, render_template
        template = load_template(str(template_file))

        # Render the template with cv_data context
        rendered_html = render_template(template, cv_data)

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # Write HTML file to output directory
        html_output = output_dir / f"{filename_base}.html"
        with open(html_output, 'w', encoding='utf-8') as f:
            f.write(rendered_html)

        # Convert HTML to PDF
        pdf_output = output_dir / f"{filename_base}.pdf"
        self._convert_html_to_pdf(html_output, pdf_output)

        return html_output, pdf_output
    
    def _render_with_quarto_engine(self, template_file: Path, work_dir: Path) -> Path:
        """Render template using Quarto engine."""         
        html_output = work_dir / f"{template_file.stem}.html"
        
        try:
            # Render to HTML
            render_cmd = [
                'quarto', 'render', str(template_file),
                '--to', 'html',
                '--output', str(html_output)
            ]
            
            result = subprocess.run(
                render_cmd, 
                capture_output=True, 
                text=True, 
                check=True, 
                cwd=work_dir,
                timeout=60
            )
            
            if not html_output.exists():
                raise FileNotFoundError(f"Quarto render succeeded but HTML output not found: {html_output}")
            
            print(f"✓ Quarto render successful: {html_output.name}")
            return html_output
            
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as e:
            print(f"⚠ Quarto render failed: {e}")
            return self._create_fallback_html_file(work_dir, template_file.stem)
    
    def _create_fallback_html_file(self, work_dir: Path, base_name: str) -> Path:
        """Create fallback HTML file when Quarto is unavailable.""" 
        html_output = work_dir / f"{base_name}.html"
        
        # Read CV data from the JSON file
        data_file = work_dir / 'temp_cv_data.json'
        if data_file.exists():
            with open(data_file, 'r', encoding='utf-8') as f:
                cv_data = json.load(f)
        else:
            cv_data = {'personal_info': {'name': 'CV Data Error'}, 'professional_summary': 'Data loading failed'}
        
        html_content = self._create_fallback_html(cv_data)
        html_output.write_text(html_content, encoding='utf-8')
        print(f"✓ Created fallback HTML: {html_output.name}")
        
        return html_output

    def _create_fallback_html(self, cv_data: Dict) -> str:
        """Create basic HTML if Quarto is not available."""
        personal_info = cv_data['personal_info']
        contact = personal_info.get('contact', {})
        
        html_parts = [
            '<!DOCTYPE html>',
            '<html><head>',
            '<meta charset="UTF-8">',
            '<link rel="stylesheet" href="cv-style.css">',
            '<title>CV</title>',
            '</head><body>',
            '<div class="cv-container">',
            '<div class="cv-header">',
            f'<h1>{personal_info.get("name", "")}</h1>',
            f'<h2>{cv_data["professional_summary"]}</h2>',
            '<div class="contact-info">',
            f'{contact.get("email", "")} | {contact.get("phone", "")} | {contact.get("address_display", "")}',
            '</div></div>',
            '<div class="cv-body">',
            '<div class="cv-left-column">',
            '<h2>Professional Experience</h2>'
        ]
        
        # Add experiences
        for exp in cv_data['experiences']:
            location = exp.get('location', {})
            location_str = location.get('city', '')
            if location.get('state'):
                location_str += f", {location['state']}"
                
            html_parts.extend([
                '<div class="experience-item">',
                f'<h3>{exp.get("company", "")} | {exp.get("title", "")}</h3>',
                '<div class="experience-meta">',
                f'{location_str} | {exp.get("start_date", "")} - {exp.get("end_date", "")}',
                '</div>'
            ])
            
            if exp.get('achievements'):
                for achievement in exp['achievements']:
                    html_parts.append(f'<p>• {achievement.get("text", "")}</p>')
            
            html_parts.append('</div>')
        
        # Add education
        html_parts.append('<h2>Education</h2>')
        for edu in cv_data['education']:
            location = edu.get('location', {})
            location_str = f"{location.get('city', '')}, {location.get('state', '')}"
            html_parts.extend([
                '<div class="education-item">',
                f'<h3>{edu.get("degree", "")} {edu.get("field", "")}</h3>',
                f'<p><strong>{edu.get("institution", "")}</strong> | {location_str} | {edu.get("end_year", "")}</p>',
                '</div>'
            ])
        
        html_parts.extend([
            '</div>',  # cv-left-column
            '<div class="cv-right-column">',
            '<h2>Core Skills</h2>'
        ])
        
        # Add skills
        for category_data in cv_data['skills_by_category']:
            html_parts.extend([
                '<div class="skills-category">',
                f'<h3>{category_data["category"]}</h3>'
            ])
            for skill in category_data['skills']:
                years_text = f" ({skill['years']} years)" if skill.get('years') else ""
                html_parts.append(f'<p>• {skill["name"]}{years_text}</p>')
            html_parts.append('</div>')
            
        html_parts.extend([
            '</div>',  # cv-right-column
            '</div>',  # cv-body
            '</div>',  # cv-container
            '</body></html>'
        ])
        
        return '\n'.join(html_parts)
    
    def _convert_html_to_pdf(self, html_file: Path, pdf_output: Path) -> None:
        """Convert HTML file to PDF.

        WeasyPrint is run in a child process so that a native-library segfault
        (exit 139) cannot kill the Flask server.  Falls back to Chrome headless,
        then to a plain-text instruction file.
        """
        # --- WeasyPrint in subprocess (crash-safe) ---
        wp_script = (
            "import sys, weasyprint; "
            "weasyprint.HTML(filename=sys.argv[1]).write_pdf(sys.argv[2])"
        )
        result = subprocess.run(
            [sys.executable, '-c', wp_script, str(html_file), str(pdf_output)],
            capture_output=True,
            timeout=120,
        )
        if result.returncode == 0:
            print(f"✓ Generated PDF using WeasyPrint: {pdf_output.name}")
            return

        wp_error = result.stderr.decode(errors='replace').strip() or f"exit {result.returncode}"
        print(f"⚠ WeasyPrint failed ({wp_error}), trying Chrome headless...")

        # --- Chrome headless fallback ---
        try:
            subprocess.run([
                'google-chrome', '--headless', '--disable-gpu', '--virtual-time-budget=5000',
                '--print-to-pdf=' + str(pdf_output),
                '--print-to-pdf-no-header',
                str(html_file)
            ], check=True, timeout=60)
            print(f"✓ Generated PDF using Chrome headless: {pdf_output.name}")
            return
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # --- Plain-text fallback ---
        fallback_content = f"""PDF Generation Failed

The system attempted to generate a PDF but encountered issues:
1. WeasyPrint error: {wp_error}
2. Chrome headless not available

To manually create PDF:
1. Open the HTML file: {html_file}
2. Print to PDF using your browser
3. Save as: {pdf_output}

The HTML file contains your formatted CV ready for conversion.
"""
        pdf_output.write_text(fallback_content.strip(), encoding='utf-8')
        print(f"⚠ Created fallback instructions: {pdf_output.name}")

    def _generate_human_pdf(
        self,
        cv_data: Dict,
        job_analysis: Dict,
        output_dir: Path,
        template_variant: str = 'standard'
    ) -> tuple:
        """Render the human-readable HTML template and convert to PDF.

        ``cv_data`` must already be prepared via ``_prepare_cv_data_for_template``
        (done once in ``generate_cv`` and shared across all format generators).

        Returns a 2-tuple ``(html_path, pdf_path)``.  On failure the first
        element is ``None`` and the second is an error-log ``.txt`` file.
        """
        company       = job_analysis.get('company', 'Company').replace(' ', '')
        role          = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        timestamp     = datetime.now().strftime("%Y-%m-%d")
        filename_base = f"CV_{company}_{role}_{timestamp}"

        try:
            # HTML is rendered and written once; PDF is converted from that file
            html_path, pdf_path = self._render_cv_html_pdf(
                cv_data, output_dir, filename_base, template_variant
            )

            print(f"✅ Generated human-readable HTML + PDF ({template_variant}): {pdf_path.name}")
            return html_path, pdf_path
            
        except Exception as e:
            print(f"⚠ PDF generation failed: {e}")
            # Create enhanced fallback with diagnostic info
            fallback_file = output_dir / f"{filename_base}.txt"
            fallback_content = f"""PDF Generation Error: {e}

This indicates an issue with the document generation pipeline.
Please check:
1. Quarto installation (quarto --version)
2. WeasyPrint dependencies (pip install weasyprint)
3. Template files in templates/ directory
4. Chrome/Chromium for PDF rendering

Template variant attempted: {template_variant}
Content data summary:
- Experiences: {len(cv_data.get('experiences', []))} items
- Skills: {len(cv_data.get('skills', []))} items
- Education: {len(cv_data.get('education', []))} items

For manual generation:
1. Check system requirements
2. Retry with different template variant
3. Use browser Print to PDF as fallback
            """
            fallback_file.write_text(fallback_content.strip(), encoding='utf-8')
            print(f"⚠ Created error log: {fallback_file.name}")
            return None, fallback_file

    def _build_json_ld(self, cv_data: Dict, job_analysis: Dict) -> str:
        """Build a Schema.org/Person JSON-LD string from prepared ``cv_data``.

        The result is embedded in the HTML ``<head>`` so that ATS parsers,
        search engines, and other structured-data consumers can extract
        candidate information without parsing the visual layout.
        """
        personal_info = cv_data['personal_info']
        contact       = personal_info.get('contact', {})

        # Work history
        has_occupation: List[Dict] = []
        for exp in cv_data.get('experiences', []):
            entry: Dict[str, Any] = {
                '@type':     'Role',
                'name':      exp.get('company', ''),
                'roleName':  exp.get('title', ''),
                'startDate': exp.get('start_date', ''),
                'endDate':   exp.get('end_date', ''),
            }
            loc = exp.get('location', {})
            if loc:
                entry['locationCreated'] = {
                    '@type': 'Place',
                    'address': {
                        '@type':           'PostalAddress',
                        'addressLocality': loc.get('city', ''),
                        'addressRegion':   loc.get('state', ''),
                    }
                }
            ach_texts = [
                (ac.get('text') if isinstance(ac, dict) else ac)
                for ac in exp.get('achievements', [])
            ]
            if ach_texts:
                entry['description'] = ' '.join(filter(None, ach_texts))
            has_occupation.append(entry)

        # Education
        alumni_of = [
            {
                '@type': 'EducationalOrganization',
                'name':  edu.get('institution', ''),
                'description': (
                    edu.get('degree', '')
                    + (f", {edu.get('field', '')}" if edu.get('field') else '')
                    + (f" ({edu.get('end_year') or edu.get('graduation_date', '')})"
                       if (edu.get('end_year') or edu.get('graduation_date')) else '')
                ),
            }
            for edu in cv_data.get('education', [])
        ]

        all_skill_names = [
            sk.get('name', '')
            for cat in cv_data.get('skills_by_category', [])
            for sk in cat.get('skills', [])
        ]

        award_strings = [
            f"{aw.get('degree') or aw.get('title', '')} ({aw.get('year', '')})"
            for aw in cv_data.get('awards', [])
        ]

        same_as = [
            v for v in (contact.get('linkedin'), contact.get('website')) if v
        ]

        json_ld: Dict[str, Any] = {
            '@context':   'https://schema.org',
            '@type':      'Person',
            'name':       personal_info.get('name', ''),
            'jobTitle':   job_analysis.get('title', ''),
            'description': cv_data.get('professional_summary', ''),
        }
        if contact.get('email'):           json_ld['email']         = contact['email']
        if contact.get('phone'):           json_ld['telephone']     = contact['phone']
        if same_as:                        json_ld['sameAs']        = same_as
        if contact.get('address_display'): json_ld['address']       = {
                '@type':           'PostalAddress',
                'addressLocality': contact['address_display'],
            }
        if alumni_of:                      json_ld['alumniOf']      = alumni_of
        if has_occupation:                 json_ld['hasOccupation'] = has_occupation
        if all_skill_names:                json_ld['knowsAbout']    = all_skill_names
        if award_strings:                  json_ld['award']         = award_strings

        return json.dumps(json_ld, indent=2, ensure_ascii=False)

    # ── Rewrite pipeline ─────────────────────────────────────────────────────

    def propose_rewrites(
        self,
        content: Dict,
        job_analysis: Dict,
        conversation_history: List = None,
        user_preferences: Dict = None,
    ) -> List[Dict]:
        """Propose targeted text rewrites to align CV terminology with the job.

        Delegates to the LLM provider's ``propose_rewrites`` implementation.
        Returns ``[]`` (with a logged warning) when no LLM client is configured
        so the caller can degrade gracefully.

        Args:
            content:              Selected CV content dict from
                                  :meth:`_select_content_hybrid`.
            job_analysis:         Output of the LLM job-description analysis.
            conversation_history: Full chat history for additional context.
            user_preferences:     Post-analysis Q&A answers.

        Returns:
            List of rewrite proposals (see :meth:`LLMClient.propose_rewrites`
            for the full schema).  Always ``[]`` on failure or missing LLM.
        """
        if not self.llm:
            print(
                "Warning: propose_rewrites called but no LLM client is "
                "configured. Returning empty proposals."
            )
            return []
        return self.llm.propose_rewrites(content, job_analysis, conversation_history, user_preferences)

    def apply_approved_rewrites(
        self, content: Dict, approved: List[Dict]
    ) -> Dict:
        """Apply a list of user-approved rewrite proposals to *content*.

        Each approved item specifies a ``location``, ``original`` text, and
        ``proposed`` replacement.  Items are applied individually; any item
        that fails :func:`LLMClient.apply_rewrite_constraints` is skipped
        (with a logged warning) rather than raising an exception.

        Supported rewrite types
        -----------------------
        ``summary``
            Replaces ``content['summary']``.
        ``bullet``
            Resolves ``location`` of the form ``"exp_ID.achievements[N]"``
            and updates the corresponding achievement's ``text`` field.
        ``skill_rename``
            Finds the skill whose name matches ``original`` and renames it
            to ``proposed``.
        ``skill_add``
            Appends a new skill dict to ``content['skills']``.  When
            ``evidence_strength == "weak"`` the entry is also flagged with
            ``candidate_to_confirm: True``.

        Args:
            content:  CV content dict (not mutated — a deep copy is made).
            approved: List of approved rewrite dicts.

        Returns:
            A new content dict with all valid approved rewrites applied.
        """
        result = copy.deepcopy(content)

        for item in approved:
            loc      = item.get('location', '')
            original = item.get('original', '')
            proposed = item.get('proposed', '')
            kind     = item.get('type', '')
            item_id  = item.get('id', '<unknown>')

            # Guard: validate constraint — skip if numbers/dates/names lost.
            if not LLMClient.apply_rewrite_constraints(original, proposed):
                print(
                    f"Warning: apply_approved_rewrites: skipping constraint "
                    f"violation (id={item_id!r}) — protected tokens would be "
                    f"removed."
                )
                continue

            if kind == 'summary' or loc == 'summary':
                result['summary'] = proposed

            elif kind == 'bullet':
                # Parse "exp_001.achievements[2]"
                m = re.match(r'^([^.]+)\.achievements\[(\d+)\]$', loc)
                if not m:
                    print(
                        f"Warning: apply_approved_rewrites: cannot parse bullet "
                        f"location {loc!r} (id={item_id!r})"
                    )
                    continue
                exp_id  = m.group(1)
                ach_idx = int(m.group(2))
                found   = False
                for exp in result.get('experiences', []):
                    if exp.get('id') == exp_id:
                        found = True
                        achs  = exp.get('achievements', [])
                        if 0 <= ach_idx < len(achs):
                            ach = achs[ach_idx]
                            if isinstance(ach, dict):
                                ach['text'] = proposed
                            else:
                                achs[ach_idx] = proposed
                        else:
                            print(
                                f"Warning: apply_approved_rewrites: achievement "
                                f"index {ach_idx} out of range for exp "
                                f"{exp_id!r} (id={item_id!r})"
                            )
                        break
                if not found:
                    print(
                        f"Warning: apply_approved_rewrites: experience "
                        f"{exp_id!r} not found (id={item_id!r})"
                    )

            elif kind == 'skill_rename':
                skills  = result.get('skills', [])
                renamed = False
                if isinstance(skills, list):
                    for i, skill in enumerate(skills):
                        if isinstance(skill, dict) and skill.get('name') == original:
                            skill['name'] = proposed
                            renamed = True
                            break
                        elif isinstance(skill, str) and skill == original:
                            skills[i] = proposed
                            renamed = True
                            break
                elif isinstance(skills, dict):
                    for cat_data in skills.values():
                        cat_list = (
                            cat_data.get('skills', [])
                            if isinstance(cat_data, dict)
                            else cat_data
                            if isinstance(cat_data, list)
                            else []
                        )
                        for i, skill in enumerate(cat_list):
                            if isinstance(skill, dict) and skill.get('name') == original:
                                skill['name'] = proposed
                                renamed = True
                                break
                            elif isinstance(skill, str) and skill == original:
                                cat_list[i] = proposed
                                renamed = True
                                break
                        if renamed:
                            break
                if not renamed:
                    print(
                        f"Warning: apply_approved_rewrites: skill_rename: "
                        f"original name {original!r} not found (id={item_id!r})"
                    )

            elif kind == 'skill_add':
                new_skill: Dict = {
                    'name':                proposed,
                    'candidate_to_confirm': item.get('evidence_strength') == 'weak',
                    'evidence':            item.get('evidence', ''),
                }
                skills = result.get('skills', [])
                if isinstance(skills, list):
                    skills.append(new_skill)
                elif isinstance(skills, dict):
                    first_cat = next(iter(skills.values()), None)
                    if isinstance(first_cat, dict):
                        first_cat.setdefault('skills', []).append(new_skill)
                    elif isinstance(first_cat, list):
                        first_cat.append(new_skill)

            else:
                print(
                    f"Warning: apply_approved_rewrites: unknown rewrite type "
                    f"{kind!r} (id={item_id!r}), skipping."
                )

        return result

    def apply_accepted_spell_fixes(
        self, content: Dict, spell_audit: List[Dict]
    ) -> Dict:
        """Apply accepted spell-check fixes to the selected content.

        Accepted fixes are grouped by ``section_id`` and applied against the
        exact span that LanguageTool flagged. Offsets are processed in reverse
        order so multiple fixes in the same section do not shift one another.
        """
        result = copy.deepcopy(content)
        accepted_by_section: Dict[str, List[Dict]] = defaultdict(list)

        for item in spell_audit or []:
            if item.get('outcome') != 'accept':
                continue
            section_id = (item.get('section_id') or '').strip()
            replacement = item.get('final') or item.get('suggestion') or ''
            if not section_id or not replacement:
                continue
            accepted_by_section[section_id].append(item)

        for section_id, fixes in accepted_by_section.items():
            if section_id == 'summary':
                summary_text = result.get('summary', '')
                result['summary'] = self._apply_spell_fixes_to_text(summary_text, fixes)
                continue

            match = re.match(r'^selected_ach_(\d+)$', section_id)
            if match:
                ach_idx = int(match.group(1))
                achievements = result.get('achievements') or []
                self._apply_spell_fixes_to_list_item(achievements, ach_idx, fixes)
                continue

            match = re.match(r'^exp_(.+)_ach_(\d+)$', section_id)
            if not match:
                match = re.match(r'^skill_(\d+)$', section_id)
                if match:
                    skills = result.get('skills') or []
                    self._apply_spell_fixes_to_skill(skills, int(match.group(1)), fixes)
                    continue

                match = re.match(r'^edu_(\d+)_(degree|field|institution)$', section_id)
                if match:
                    self._apply_spell_fixes_to_named_field(
                        result.get('education') or [],
                        int(match.group(1)),
                        match.group(2),
                        fixes,
                    )
                    continue

                match = re.match(r'^award_(\d+)_title$', section_id)
                if match:
                    awards = result.get('awards') or []
                    award_idx = int(match.group(1))
                    if 0 <= award_idx < len(awards):
                        award = awards[award_idx]
                        field_name = 'degree' if isinstance(award, dict) and award.get('degree') else 'title'
                        self._apply_spell_fixes_to_named_field(awards, award_idx, field_name, fixes)
                    continue

                match = re.match(r'^cert_(\d+)_(name|issuer)$', section_id)
                if match:
                    self._apply_spell_fixes_to_named_field(
                        result.get('certifications') or [],
                        int(match.group(1)),
                        match.group(2),
                        fixes,
                    )
                    continue

                match = re.match(r'^lang_(\d+)(?:_(language|proficiency))?$', section_id)
                if match:
                    languages = result.get('personal_info', {}).get('languages') or []
                    lang_idx = int(match.group(1))
                    field_name = match.group(2)
                    self._apply_spell_fixes_to_language(languages, lang_idx, field_name, fixes)
                    continue

                match = re.match(r'^pub_(\d+)_(formatted|title|authors|journal|booktitle)$', section_id)
                if match:
                    publications = result.get('publications') or []
                    pub_idx = int(match.group(1))
                    field_name = match.group(2)
                    self._apply_spell_fixes_to_named_field(publications, pub_idx, field_name, fixes)
                    continue

                print(
                    f"Warning: apply_accepted_spell_fixes: cannot parse "
                    f"section id {section_id!r}"
                )
                continue

            exp_id = match.group(1)
            ach_idx = int(match.group(2))
            exp = next(
                (item for item in result.get('experiences', []) if item.get('id') == exp_id),
                None,
            )
            if exp is None:
                print(
                    f"Warning: apply_accepted_spell_fixes: experience "
                    f"{exp_id!r} not found for section {section_id!r}"
                )
                continue

            for key in ('ordered_achievements', 'achievements'):
                achievements = exp.get(key) or []
                if not (0 <= ach_idx < len(achievements)):
                    continue
                achievement = achievements[ach_idx]
                current_text = (
                    achievement.get('text', '')
                    if isinstance(achievement, dict)
                    else str(achievement)
                )
                updated_text = self._apply_spell_fixes_to_text(current_text, fixes)
                if isinstance(achievement, dict):
                    achievement['text'] = updated_text
                else:
                    achievements[ach_idx] = updated_text

        return result

    def _apply_spell_fixes_to_list_item(
        self, items: List[Any], item_idx: int, fixes: List[Dict]
    ) -> None:
        """Apply accepted spell fixes to a list item with optional ``text`` field."""
        if not (0 <= item_idx < len(items)):
            return
        item = items[item_idx]
        current_text = item.get('text', '') if isinstance(item, dict) else str(item)
        updated_text = self._apply_spell_fixes_to_text(current_text, fixes)
        if isinstance(item, dict):
            item['text'] = updated_text
        else:
            items[item_idx] = updated_text

    def _apply_spell_fixes_to_skill(
        self, skills: List[Any], skill_idx: int, fixes: List[Dict]
    ) -> None:
        """Apply accepted spell fixes to a skill name."""
        if not (0 <= skill_idx < len(skills)):
            return
        skill = skills[skill_idx]
        current_text = skill.get('name', '') if isinstance(skill, dict) else str(skill)
        updated_text = self._apply_spell_fixes_to_text(current_text, fixes)
        if isinstance(skill, dict):
            skill['name'] = updated_text
        else:
            skills[skill_idx] = updated_text

    def _apply_spell_fixes_to_named_field(
        self, items: List[Any], item_idx: int, field_name: str, fixes: List[Dict]
    ) -> None:
        """Apply accepted spell fixes to a specific named field on a list item."""
        if not (0 <= item_idx < len(items)):
            return
        item = items[item_idx]
        if not isinstance(item, dict) or field_name not in item:
            return
        item[field_name] = self._apply_spell_fixes_to_text(str(item.get(field_name, '')), fixes)

    def _apply_spell_fixes_to_language(
        self, languages: List[Any], lang_idx: int, field_name: Optional[str], fixes: List[Dict]
    ) -> None:
        """Apply accepted spell fixes to language entries."""
        if not (0 <= lang_idx < len(languages)):
            return
        item = languages[lang_idx]
        if isinstance(item, dict):
            target_field = field_name or ('language' if 'language' in item else None)
            if target_field and target_field in item:
                item[target_field] = self._apply_spell_fixes_to_text(str(item.get(target_field, '')), fixes)
        else:
            languages[lang_idx] = self._apply_spell_fixes_to_text(str(item), fixes)

    @staticmethod
    def _apply_spell_fixes_to_text(text: str, fixes: List[Dict]) -> str:
        """Apply accepted spell fixes to a single text fragment."""
        if not text:
            return text

        updated = text
        sortable_fixes = []
        for item in fixes or []:
            try:
                offset = int(item.get('offset'))
                length = int(item.get('length'))
            except (TypeError, ValueError):
                continue
            sortable_fixes.append((offset, length, item))

        for offset, length, item in sorted(sortable_fixes, key=lambda row: row[0], reverse=True):
            replacement = item.get('final') or item.get('suggestion') or ''
            if not replacement:
                continue
            if offset < 0 or length < 0 or offset + length > len(updated):
                continue

            original = item.get('original', '')
            current_span = updated[offset:offset + length]
            if original and current_span != original:
                continue

            updated = updated[:offset] + replacement + updated[offset + length:]

        return updated

    # ── CV generation ─────────────────────────────────────────────────────────

    def generate_cv(
        self,
        job_analysis: Dict,
        customizations: Dict,
        output_dir: Optional[Path] = None,
        approved_rewrites: Optional[List[Dict]] = None,
        rewrite_audit: Optional[List[Dict]] = None,
        spell_audit: Optional[List[Dict]] = None,
        max_skills: Optional[int] = None,
    ) -> Dict:
        """
        Generate CV files based on LLM analysis and recommendations.

        Parameters
        ----------
        job_analysis:
            Output of :meth:`LLMClient.analyze_job_description`.
        customizations:
            Output of :meth:`LLMClient.recommend_customizations`.
        output_dir:
            When provided (e.g. the already-renamed session directory) the CV
            files are written there.  Otherwise a new
            ``{Company}_{RoleSlug}_{date}`` directory is created under
            ``self.output_dir``.
        approved_rewrites:
            Optional list of user-approved rewrite proposals produced by
            :meth:`propose_rewrites`.  Each item is applied via
            :meth:`apply_approved_rewrites` before content is rendered.
            Defaults to ``[]`` (no rewrites) when ``None``.

        Returns
        -------
        Dict with output_dir, files created, metadata
        """
        company   = job_analysis.get('company', 'Company')
        role      = job_analysis.get('title', 'Role')
        role_slug = role.replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")

        if output_dir is not None:
            job_output_dir = Path(output_dir)
        else:
            output_name    = f"{company}_{role_slug}_{timestamp}"
            job_output_dir = self.output_dir / output_name
        job_output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Output directory: {job_output_dir}")
        
        selected_content = self.build_render_ready_content(
            job_analysis,
            customizations,
            approved_rewrites=approved_rewrites,
            spell_audit=spell_audit,
            max_skills=max_skills,
        )

        # Prepare template data once — shared by all format generators.
        # JSON-LD is built here and embedded directly in cv-template.html,
        # so the single HTML output is both ATS-compatible and print-ready.
        cv_data = self._prepare_cv_data_for_template(selected_content, job_analysis)
        cv_data['achievements'] = selected_content.get('achievements', [])
        cv_data['json_ld_str']  = self._build_json_ld(cv_data, job_analysis)

        # Generate documents (Phase 10: Track progress)
        files_created = []
        generation_progress = []

        # 1. ATS-optimized DOCX
        progress_ats = {
            'step': 'generating_docx_ats',
            'status': 'in_progress',
            'start_time': time.time()
        }
        ats_file = self._generate_ats_docx(
            selected_content,
            job_analysis,
            job_output_dir
        )
        progress_ats['status'] = 'complete'
        progress_ats['elapsed_ms'] = int((time.time() - progress_ats['start_time']) * 1000)
        generation_progress.append(progress_ats)
        files_created.append(ats_file.name)

        # 2. Single HTML (ATS metadata embedded) + PDF both rendered from it
        progress_html = {
            'step': 'rendering_html',
            'status': 'in_progress',
            'start_time': time.time()
        }
        html_path, pdf_path = self._generate_human_pdf(
            cv_data,
            job_analysis,
            job_output_dir
        )
        progress_html['status'] = 'complete'
        progress_html['elapsed_ms'] = int((time.time() - progress_html['start_time']) * 1000)
        generation_progress.append(progress_html)
        if html_path is not None:
            files_created.append(html_path.name)
        files_created.append(pdf_path.name)

        # 3. Human-readable DOCX
        progress_docx_human = {
            'step': 'generating_docx_human',
            'status': 'in_progress',
            'start_time': time.time()
        }
        human_docx = self._generate_human_docx(
            selected_content,
            job_analysis,
            job_output_dir
        )
        progress_docx_human['status'] = 'complete'
        progress_docx_human['elapsed_ms'] = int((time.time() - progress_docx_human['start_time']) * 1000)
        generation_progress.append(progress_docx_human)
        files_created.append(human_docx.name)
        # Save metadata
        metadata = {
            'generation_date': datetime.now().isoformat(),
            'company':         company,
            'role':            role,
            'job_analysis':    job_analysis,
            'customizations':  customizations,
            'approved_rewrites': approved_rewrites or [],
            'rewrite_audit':   rewrite_audit or [],
            'spell_audit':     spell_audit or [],
            'selected_content_summary': {
                'experiences_count': len(selected_content['experiences']),
                'skills_count': len(selected_content['skills']),
                'achievements_count': len(selected_content['achievements'])
            },
            'files_generated': files_created
        }
        
        metadata_file = job_output_dir / 'metadata.json'
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        files_created.append('metadata.json')
        
        # Save job description
        if job_analysis.get('original_text'):
            job_desc_file = job_output_dir / 'job_description.txt'
            job_desc_file.write_text(job_analysis['original_text'], encoding='utf-8')
            files_created.append('job_description.txt')
        
        return {
            'output_dir': str(job_output_dir),
            'files': files_created,
            'metadata': metadata,
            'generation_progress': generation_progress,
        }

    def build_render_ready_content(
        self,
        job_analysis: Dict,
        customizations: Dict,
        approved_rewrites: Optional[List[Dict]] = None,
        spell_audit: Optional[List[Dict]] = None,
        max_skills: Optional[int] = None,
        use_semantic_match: bool = True,
    ) -> Dict:
        """Build the selected content exactly as it will be rendered."""
        selected_content = self._select_content_hybrid(
            job_analysis,
            customizations,
            max_skills=max_skills,
            use_semantic_match=use_semantic_match,
        )
        selected_content = self.apply_approved_rewrites(
            selected_content,
            approved_rewrites or [],
        )
        return self.apply_accepted_spell_fixes(
            selected_content,
            spell_audit or [],
        )

    def _serialize_html_for_context(self, html: str) -> str:
        """Convert HTML to human-readable outline for LLM context.

        Parses HTML and extracts section names, nesting, and item counts
        to create a concise structure description. Used to give LLM
        context about current CV layout without sending full HTML.

        Args:
            html: The HTML document to serialize

        Returns:
            Human-readable outline showing section structure and item counts
        """
        import re

        # Extract major sections (h1, h2)
        outline = []

        # Find all major headings
        h_tags = re.findall(r'<h[23][^>]*>([^<]+)</h[23]>', html)

        # Count total items in document (simple heuristic for LLM context)
        total_li_count = len(re.findall(r'<li[^>]*>[^<]*</li>', html))

        for i, heading in enumerate(h_tags, 1):
            outline.append(f"{i}. {heading.strip()}")

        if total_li_count > 0:
            outline.append(f"\nTotal items: {total_li_count}")

        return '\n'.join(outline) if outline else "[No structured sections found]"

    def apply_layout_instruction(
        self,
        instruction_text: str,
        current_html: str,
        prior_instructions: Optional[List[Dict]] = None
    ) -> Dict:
        """Apply natural-language layout instruction to HTML via LLM.

        Interprets user's plain-English layout request (e.g., "Move Publications
        after Skills") and modifies HTML structure accordingly without altering
        text content.

        Args:
            instruction_text: Plain-English instruction from user
            current_html: Current HTML document to modify
            prior_instructions: List of previously applied instructions (for context)

        Returns:
            {
                'html': modified HTML (if successful),
                'summary': change description,
                'confidence': score 0.0-1.0,
                'error': error message (if applicable),
                'question': clarification question (if confidence < 0.7 or ambiguous),
                'requires_clarification': bool
            }
        """
        # Build LLM prompt
        cv_outline = self._serialize_html_for_context(current_html)
        prior_context = ""
        if prior_instructions:
            prior_list = [f"- {inst.get('instruction_text', '')}" for inst in prior_instructions]
            prior_context = "\n\nPRIOR INSTRUCTIONS APPLIED:\n" + "\n".join(prior_list)

        prompt = f"""You are a CV layout assistant. Your job is to interpret user requests and modify CV HTML structure.

CURRENT CV STRUCTURE (outline):
{cv_outline}

CURRENT HTML (modify this):
{current_html}
{prior_context}

USER INSTRUCTION:
"{instruction_text}"

YOUR TASK:
1. Interpret the user's intent
2. Modify the HTML to reflect the instruction (reorder sections, adjust spacing, etc.)
3. Return ONLY valid JSON (no markdown, no explanations outside the JSON):

{{
  "modified_html": "[complete modified HTML]",
  "change_summary": "[2-3 sentence human-readable summary of what changed]",
  "confidence": 0.95,
  "requires_clarification": false
}}

IMPORTANT CONSTRAINTS:
- Never modify text content (only structure/CSS/order)
- Preserve all existing text exactly
- Return the full HTML document (not a diff or excerpt)
- If unsure of intent, set confidence < 0.7 and include clarification_question

If you need clarification, return:
{{
  "requires_clarification": true,
  "clarification_question": "[your question]",
  "confidence": 0.5
}}
"""

        try:
            # Call LLM to interpret and modify HTML
            response = self.llm.call_llm(
                prompt=prompt,
                system_prompt="You are an expert HTML/CSS layout modifier. You modify CV structure without changing content.",
                temperature=0.3  # Low temperature for precise modifications
            )

            # Guard against empty response before JSON parsing
            import json
            if not response or not response.strip():
                return {
                    'error': 'parse_error',
                    'details': 'LLM returned an empty response',
                    'raw_response': response or ''
                }

            result = json.loads(response)

            # Validate response structure
            if result.get('requires_clarification', False):
                return {
                    'error': 'clarify',
                    'clarification_question': result.get('clarification_question', ''),
                    'confidence': result.get('confidence', 0.5)
                }

            # Check confidence before HTML validation so low-confidence responses
            # are surfaced correctly even when modified_html is empty/short.
            confidence = result.get('confidence', 0.7)
            if confidence < 0.7:
                return {
                    'error': 'low_confidence',
                    'question': f"Low confidence ({confidence:.0%}). Could you clarify: {instruction_text}?",
                    'confidence': confidence
                }

            # Extract modified HTML and validate it's not empty
            modified_html = result.get('modified_html', '')
            if not modified_html:
                return {
                    'error': 'parse_failed',
                    'details': 'HTML response was empty'
                }

            return {
                'html': modified_html,
                'summary': result.get('change_summary', 'Layout updated'),
                'confidence': confidence,
                'requires_clarification': False
            }

        except json.JSONDecodeError as e:
            return {
                'error': 'parse_error',
                'details': f'LLM response was not valid JSON: {str(e)}',
                'raw_response': response
            }
        except Exception as e:
            return {
                'error': 'processing_error',
                'details': f'Failed to apply layout instruction: {str(e)}'
            }

    def _select_content_hybrid(
        self,
        job_analysis: Dict,
        customizations: Dict,
        max_skills: Optional[int] = None,
        use_semantic_match: bool = True,
    ) -> Dict:
        """
        Select content using hybrid LLM + rule-based approach.

        Inclusion rules
        ---------------
        Experiences : ALL experiences are included EXCEPT those where the user
            has explicitly approved an "Omit" decision.  The set is sorted by
            relevance score (Emphasize items first) so the most relevant
            content appears first in the generated document.
        Achievements: same blacklist rule.
        Skills      : same blacklist rule; LLM-recommended skills are listed
            first, remaining non-omitted skills follow by score.
        """
        # IDs/names explicitly omitted by the user
        omitted_exp_ids      = set(customizations.get('omitted_experiences', []))
        omitted_skill_names  = set(customizations.get('omitted_skills', []))
        omitted_ach_ids      = set(customizations.get('omitted_achievements', []))

        # IDs carrying an extra relevance boost from user/LLM recommendations
        recommended_exp_ids          = set(customizations.get('recommended_experiences', []))
        recommended_achievement_ids  = set(customizations.get('recommended_achievements', []))
        recommended_skills           = set(customizations.get('recommended_skills', []))

        # Also honour per-item recommendation dicts (LLM structured output)
        for rec in customizations.get('experience_recommendations', []):
            if isinstance(rec, dict):
                if rec.get('recommendation', '').lower() == 'omit':
                    omitted_exp_ids.add(rec.get('id', ''))
                elif rec.get('recommendation', '').lower() in ('emphasize', 'include', 'de-emphasize'):
                    recommended_exp_ids.add(rec.get('id', ''))
        for rec in customizations.get('skill_recommendations', []):
            if isinstance(rec, dict):
                if rec.get('recommendation', '').lower() == 'omit':
                    omitted_skill_names.add(rec.get('name', ''))

        # Get all content
        all_experiences  = self.master_data.get('experience', [])
        all_achievements = self.master_data.get('selected_achievements', [])
        all_skills_raw   = self.master_data.get('skills', [])
        all_skills: List[Dict] = []

        if isinstance(all_skills_raw, dict):
            for category_data in all_skills_raw.values():
                if isinstance(category_data, dict) and isinstance(category_data.get('skills'), list):
                    for skill in category_data.get('skills', []):
                        if isinstance(skill, dict):
                            all_skills.append(skill)
                        elif isinstance(skill, str):
                            all_skills.append({'name': skill})
                elif isinstance(category_data, list):
                    for skill in category_data:
                        if isinstance(skill, dict):
                            all_skills.append(skill)
                        elif isinstance(skill, str):
                            all_skills.append({'name': skill})
        elif isinstance(all_skills_raw, list):
            for skill in all_skills_raw:
                if isinstance(skill, dict):
                    all_skills.append(skill)
                elif isinstance(skill, str):
                    all_skills.append({'name': skill})

        # Scoring helpers
        job_keywords     = set(job_analysis.get('ats_keywords', []))
        job_requirements = (
            job_analysis.get('must_have_requirements', []) +
            job_analysis.get('nice_to_have_requirements', [])
        )
        domain = job_analysis.get('domain', '')
        cfg    = get_config()
        max_ach    = cfg.get('generation.max_achievements', 5)
        max_skills = max_skills if max_skills is not None else cfg.get('generation.max_skills', 20)

        # ── Experiences ───────────────────────────────────────────────────────
        # Include ALL experiences; only exclude those explicitly omitted.
        scored_experiences = []
        for exp in all_experiences:
            exp_id = exp.get('id', '')
            if exp_id in omitted_exp_ids:
                continue  # user approved Omit — skip

            # Boost for recommended items
            llm_score     = 10.0 if exp_id in recommended_exp_ids else 0.0
            keyword_score = calculate_relevance_score(exp, job_keywords, job_requirements, domain)
            semantic_score = 0.0
            if self.llm and use_semantic_match:
                semantic_score = self.llm.semantic_match(json.dumps(exp), job_requirements) * 10

            scored_experiences.append((exp, llm_score + keyword_score + semantic_score))

        scored_experiences.sort(key=lambda x: x[1], reverse=True)
        selected_experiences = [exp for exp, _ in scored_experiences]

        # Override: if the user has explicitly reordered experience rows via the UI,
        # apply their ordering stored in customizations['experience_row_order']
        # as a list of experience IDs in the desired display order.
        experience_row_order = customizations.get('experience_row_order', [])
        if experience_row_order:
            order_map = {eid: i for i, eid in enumerate(experience_row_order)}
            selected_experiences = sorted(
                selected_experiences,
                key=lambda e: order_map.get(e.get('id', ''), len(order_map)),
            )

        # ── Per-experience bullet ordering ────────────────────────────────────
        # Default: sort bullets by keyword-overlap relevance.
        # Override: if the user has explicitly reordered bullets via the UI,
        # apply their ordering stored in customizations['achievement_orders']
        # as a list of original indices per experience id.
        achievement_orders = customizations.get('achievement_orders', {})
        ordered_experiences = []
        for exp in selected_experiences:
            exp_id = exp.get('id', '')
            achievements = list(exp.get('achievements') or [])
            if not achievements:
                ordered_experiences.append(exp)
                continue

            if exp_id in achievement_orders:
                user_order = achievement_orders[exp_id]
                reordered = []
                seen_in_order = set()
                for idx in user_order:
                    try:
                        reordered.append(achievements[idx])
                        seen_in_order.add(idx)
                    except IndexError:
                        pass
                for i, a in enumerate(achievements):
                    if i not in seen_in_order:
                        reordered.append(a)
                achievements = reordered
            elif job_keywords:
                def _ach_relevance(ach, _kws=job_keywords):
                    text = (ach.get('text', '') if isinstance(ach, dict) else str(ach)).lower()
                    tokens = set(re.findall(r'\b\w+\b', text))
                    expanded: set = set()
                    for t in tokens:
                        c = self._expansion_index.get(t)
                        if c:
                            expanded.add(c.lower())
                    return len((tokens | expanded) & {kw.lower() for kw in _kws})
                achievements = sorted(achievements, key=_ach_relevance, reverse=True)

            exp = dict(exp)
            exp['ordered_achievements'] = achievements
            ordered_experiences.append(exp)
        selected_experiences = ordered_experiences

        # ── Achievements ──────────────────────────────────────────────────────
        scored_achievements = []
        for ach in all_achievements:
            ach_id = ach.get('id', '')
            if ach_id in omitted_exp_ids or ach_id in omitted_ach_ids:
                continue

            llm_score     = 10.0 if ach_id in recommended_achievement_ids else 0.0
            keyword_score = calculate_relevance_score(ach, job_keywords, job_requirements, domain)
            semantic_score = 0.0
            if self.llm and use_semantic_match:
                semantic_score = self.llm.semantic_match(json.dumps(ach), job_requirements) * 10

            scored_achievements.append((ach, llm_score + keyword_score + semantic_score))

        scored_achievements.sort(key=lambda x: x[1], reverse=True)
        selected_achievements = [ach for ach, _ in scored_achievements[:max_ach]]

        # ── Skills ────────────────────────────────────────────────────────────
        # Include all non-omitted skills; recommended ones appear first.
        selected_skills: List[Dict] = []
        remaining_skills: List[tuple] = []

        for skill in all_skills:
            skill_name = skill.get('name', '')
            if skill_name in omitted_skill_names:
                continue
            if skill_name in recommended_skills:
                selected_skills.append(skill)
            else:
                skill_score = calculate_skill_score(
                    skill,
                    job_keywords,
                    job_analysis.get('required_skills', [])
                )
                remaining_skills.append((skill, skill_score))

        remaining_skills.sort(key=lambda x: x[1], reverse=True)
        for skill, _ in remaining_skills:
            selected_skills.append(skill)
            if len(selected_skills) >= max_skills:
                break

        # Prepend extra_skills: LLM-suggested skills not in master CV that the user approved
        extra_skills = customizations.get('extra_skills', [])
        if extra_skills:
            existing_skill_names = {s.get('name', '') for s in all_skills}
            prepend = []
            for skill_name in extra_skills:
                if skill_name not in omitted_skill_names and skill_name not in existing_skill_names:
                    prepend.append({'name': skill_name})
            selected_skills = prepend + selected_skills

        # Override: if the user has explicitly reordered skill rows via the UI,
        # apply their ordering stored in customizations['skill_row_order']
        # as a list of skill names in the desired display order.
        skill_row_order = customizations.get('skill_row_order', [])
        if skill_row_order:
            order_map = {name: i for i, name in enumerate(skill_row_order)}
            selected_skills = sorted(
                selected_skills,
                key=lambda s: order_map.get(s.get('name', ''), len(order_map)),
            )

        # Select professional summary — session_summaries (e.g. LLM-generated
        # "ai_recommended") overlay master data so they take precedence.
        master_summaries  = self.master_data.get('professional_summaries', {})
        session_summaries = customizations.get('session_summaries', {})
        all_summaries     = {**master_summaries, **session_summaries}
        summary_key       = customizations.get('summary_focus', 'default')
        selected_summary  = all_summaries.get(summary_key) or all_summaries.get('default', '')

        # Select publications — honour user accept/reject decisions if present
        accepted_pubs = customizations.get('accepted_publications')  # list of cite_keys or None
        rejected_pubs = set(customizations.get('rejected_publications') or [])

        if accepted_pubs is not None:
            # User has explicitly selected publications — use their ordered list
            accepted_set = set(accepted_pubs)
            pub_by_key = {}
            for pub in self._select_publications(job_analysis, max_count=len(self.publications) if self.publications else 50):
                key = pub.get('key', '') or ''
                if key in accepted_set and key not in rejected_pubs:
                    pub_by_key[key] = pub
            # Preserve the user's explicit ordering from accepted_pubs
            selected_publications = [pub_by_key[k] for k in accepted_pubs if k in pub_by_key][:15]
        else:
            selected_publications = self._select_publications(job_analysis, max_count=10)
        
        return {
            'personal_info': self.master_data.get('personal_info', {}),
            'summary': selected_summary,
            'experiences': selected_experiences,
            'achievements': selected_achievements,
            'skills': selected_skills,
            'education': self.master_data.get('education', []),
            'certifications': self.master_data.get('certifications', []),
            'publications': selected_publications,
            'awards': self.master_data.get('awards', [])
        }
    
    def _select_publications(self, job_analysis: Dict, max_count: int = 10) -> List[Dict]:
        """Select most relevant publications."""
        if not self.publications:
            return []
        
        domain = job_analysis.get('domain', '')
        keywords = set(job_analysis.get('ats_keywords', []))
        
        scored_pubs = []
        for key, pub in self.publications.items():
            score = 0.0

            # Recent publications score higher
            try:
                year = int(pub['year'])
                if year >= 2020:
                    score += 30
                elif year >= 2015:
                    score += 20
                elif year >= 2010:
                    score += 10
            except (ValueError, KeyError):
                pass

            # Type bonus
            if pub['type'] == 'article':
                score += 25
            elif pub['type'] in ['inproceedings', 'conference']:
                score += 20

            # Keyword matches
            title_lower = pub['title'].lower()
            matches = sum(1 for kw in keywords if kw.lower() in title_lower)
            score += matches * 5

            # Domain-specific
            if domain == 'genomics' and any(
                term in title_lower for term in ['genom', 'gene', 'dna', 'rna']
            ):
                score += 15

            scored_pubs.append((key, pub, score))

        scored_pubs.sort(key=lambda x: x[2], reverse=True)

        selected = []
        for key, pub, score in scored_pubs[:max_count]:
            formatted = format_publication(pub, style='brief')
            selected.append({
                'key': key,
                'formatted': formatted,
                'year': pub['year'],
                'type': pub['type']
            })

        return selected
    
    def _generate_ats_docx(
        self,
        content: Dict,
        job_analysis: Dict,
        output_dir: Path
    ) -> Path:
        """Generate ATS-optimized DOCX with enhanced formatting and validation."""
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
        from docx.enum.style import WD_STYLE_TYPE
        
        doc = Document()
        
        # Set up ATS-optimized styles
        self._setup_ats_styles(doc)
        
        # Header with contact information (ATS-friendly format)
        personal = content['personal_info']
        name = personal.get('name', '')
        
        # Name header — use Heading 1 so ATS parsers see the correct heading hierarchy.
        name_para = doc.add_paragraph(name, style='Heading 1')
        name_para.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        
        # Contact information - single line, pipe-separated (ATS standard)
        contact = personal.get('contact', {})
        contact_parts = []
        
        if contact.get('email'):
            contact_parts.append(contact['email'])
        if contact.get('phone'):
            contact_parts.append(contact['phone'])
        if contact.get('address_display'):
            contact_parts.append(contact['address_display'])
        elif contact.get('address', {}).get('city'):
            city = contact['address']['city']
            state = contact['address'].get('state', '')
            contact_parts.append(f"{city}, {state}".strip(', '))
        if contact.get('linkedin'):
            contact_parts.append(contact['linkedin'])
        
        contact_para = doc.add_paragraph(' | '.join(contact_parts))
        contact_para.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        
        # Add spacing
        doc.add_paragraph()
        
        # Professional Summary - Critical for ATS
        summary_heading = doc.add_paragraph()
        summary_heading.add_run('PROFESSIONAL SUMMARY').bold = True
        summary_heading.style = 'Heading 2'
        
        summary_text = content.get('summary', '')
        # Enhance summary with job-specific keywords
        enhanced_summary = self._enhance_summary_for_ats(summary_text, job_analysis)
        doc.add_paragraph(enhanced_summary)
        doc.add_paragraph()
        
        # Core Competencies/Skills Section - ATS keyword optimization
        skills_heading = doc.add_paragraph()
        skills_heading.add_run('CORE COMPETENCIES').bold = True
        skills_heading.style = 'Heading 2'
        
        # Organize skills for maximum ATS impact
        ats_optimized_skills = self._optimize_skills_for_ats(content['skills'], job_analysis)
        skills_para = doc.add_paragraph()
        skills_para.add_run(' • '.join(ats_optimized_skills))
        doc.add_paragraph()
        
        # Professional Experience - Standard ATS format
        exp_heading = doc.add_paragraph()
        exp_heading.add_run('PROFESSIONAL EXPERIENCE').bold = True
        exp_heading.style = 'Heading 2'
        
        for exp in content['experiences']:
            # Job title and company - Bold, clear format
            title_company = f"{exp.get('title', '')} | {exp.get('company', '')}"
            title_para = doc.add_paragraph()
            title_run = title_para.add_run(title_company)
            title_run.bold = True
            title_run.font.size = Pt(11)
            
            # Dates and location - Standard ATS format
            location_parts = []
            if exp.get('location', {}).get('city'):
                location_parts.append(exp['location']['city'])
            if exp.get('location', {}).get('state'):
                location_parts.append(exp['location']['state'])
            location_str = ', '.join(location_parts) if location_parts else ''
            
            dates_location = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"
            if location_str:
                dates_location += f" | {location_str}"
            
            doc.add_paragraph(dates_location)
            
            # Achievements - Bullet points with quantified results
            if exp.get('achievements'):
                for achievement in exp['achievements']:
                    achievement_text = achievement.get('text', '') if isinstance(achievement, dict) else str(achievement)
                    # Enhance achievement with keywords if needed
                    enhanced_achievement = self._enhance_achievement_for_ats(achievement_text, job_analysis)
                    achievement_para = doc.add_paragraph(enhanced_achievement, style='List Bullet')
                    achievement_para.paragraph_format.left_indent = Pt(18)
            
            doc.add_paragraph()  # Spacing between positions
        
        # Education - Standard format
        if content.get('education'):
            edu_heading = doc.add_paragraph()
            edu_heading.add_run('EDUCATION').bold = True
            edu_heading.style = 'Heading 2'
            
            for edu in content['education']:
                degree = edu.get('degree', '')
                field = edu.get('field', '')
                institution = edu.get('institution', '')
                year = edu.get('end_year', '')
                
                degree_line = f"{degree} {field}".strip()
                institution_line = f"{institution}"
                if year:
                    institution_line += f" | {year}"
                
                degree_para = doc.add_paragraph()
                degree_para.add_run(degree_line).bold = True
                doc.add_paragraph(institution_line)
            
            doc.add_paragraph()
        
        # Additional Sections (if present)
        self._add_ats_additional_sections(doc, content, job_analysis)
        
        # Save with ATS-optimized filename
        company = job_analysis.get('company', 'Company').replace(' ', '').replace('/', '-')[:15]
        role = job_analysis.get('title', 'Role').replace(' ', '').replace('/', '-')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        
        filename = f"CV_{company}_{role}_{timestamp}_ATS.docx"
        filepath = output_dir / filename
        doc.save(str(filepath))
        
        # Validate ATS compatibility
        ats_score = self._validate_ats_compatibility(content, job_analysis)
        print(f"✓ Generated ATS DOCX: {filename} (ATS Score: {ats_score}/100)")
        
        return filepath
    
    def _setup_ats_styles(self, doc):
        """Set up ATS-optimized document styles."""
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
        
        # Create custom styles that are ATS-friendly
        styles = doc.styles

        # Heading 1 — used for the candidate name at the top of the ATS DOCX
        try:
            heading1 = styles['Heading 1']
            heading1.font.size = Pt(16)
            heading1.font.bold = True
            heading1.font.color.rgb = RGBColor(0, 0, 0)
        except KeyError:
            pass

        # Clean heading style
        try:
            heading2 = styles['Heading 2']
            heading2.font.size = Pt(12)
            heading2.font.bold = True
            heading2.font.color.rgb = RGBColor(0, 0, 0)  # Pure black for ATS
        except KeyError:
            pass
            
        # Clean list style
        try:
            list_bullet = styles['List Bullet']
            list_bullet.font.size = Pt(10)
        except KeyError:
            pass
    
    def _enhance_summary_for_ats(self, summary: str, job_analysis: Dict) -> str:
        """Return the professional summary unchanged.

        Terminology improvements are handled upstream via
        :meth:`apply_approved_rewrites` before the content reaches this
        stage.  This method is retained as the call site in the ATS DOCX
        generator but no longer mutates the text.

        When no LLM is configured a keyword-gap note is logged so the
        operator is aware of potential ATS misalignment without the output
        being silently altered.
        """
        if not summary:
            return summary

        if not self.llm:
            # Identify missing keywords and log a gap warning.
            summary_lower    = summary.lower()
            key_skills       = job_analysis.get('required_skills', [])
            missing_keywords = [
                s for s in key_skills[:5] if s.lower() not in summary_lower
            ]
            if missing_keywords:
                print(
                    f"Warning: _enhance_summary_for_ats: no LLM configured; "
                    f"summary may be missing keywords: "
                    f"{', '.join(missing_keywords)}"
                )
        else:
            print(
                "Info: _enhance_summary_for_ats: summary rewrites are handled "
                "upstream via apply_approved_rewrites — returning unchanged."
            )

        return summary
    
    def _optimize_skills_for_ats(self, skills: List[Dict], job_analysis: Dict) -> List[str]:
        """Return a score-ordered, deduplicated subset of skill names.

        Synonym expansion is applied so that a skill named 'ML' scores a
        match against job keyword 'Machine Learning' and vice versa.
        Only reorders and selects skills — terminology is never renamed here.
        All vocabulary changes must come via :meth:`apply_approved_rewrites`
        before content reaches this method.
        """
        ats_keywords = set(kw.lower() for kw in job_analysis.get('ats_keywords', []))
        required_skills = set(skill.lower() for skill in job_analysis.get('required_skills', []))

        # Expand ATS keywords via synonym map so we can match either direction
        expanded_ats: set = set(ats_keywords)
        for kw in list(ats_keywords):
            canonical = self._expansion_index.get(kw)
            if canonical:
                expanded_ats.add(canonical.lower())
        expanded_required: set = set(required_skills)
        for req in list(required_skills):
            canonical = self._expansion_index.get(req)
            if canonical:
                expanded_required.add(canonical.lower())

        # Priority scoring for skills
        skill_scores = []
        for skill in skills:
            name = skill.get('name', '')
            name_lower = name.lower()
            canonical_lower = self.canonical_skill_name(name).lower()
            years = skill.get('years', 0)

            score = 0
            # High priority for exact keyword matches (direct or via synonym)
            if name_lower in expanded_ats or canonical_lower in expanded_ats:
                score += 50
            if name_lower in expanded_required or canonical_lower in expanded_required:
                score += 40
            # Years of experience bonus
            score += min(years * 2, 20)

            skill_scores.append((name, score))

        # Sort by score and return top skills
        skill_scores.sort(key=lambda x: x[1], reverse=True)

        # Return optimized skill names (top 15 for ATS readability)
        return [skill[0] for skill in skill_scores[:15]]
    
    def _enhance_achievement_for_ats(self, achievement: str, job_analysis: Dict) -> str:
        """Return the achievement text unchanged.

        Checks whether the text opens with a strong action verb and logs a
        warning when it does not, but never modifies the text.  Rewrites are
        handled upstream via :meth:`apply_approved_rewrites`.
        """
        if not achievement:
            return achievement

        text = achievement.strip()
        if text.split()[0].lower() not in self._STRONG_VERBS_LOWER if text.split() else True:
            print(
                f"Warning: _enhance_achievement_for_ats: bullet does not start "
                f"with a strong action verb: {text[:60]!r}"
            )

        return text

    # ── Persuasion vocabulary ──────────────────────────────────────────────────

    _STRONG_VERBS: frozenset = frozenset({
        'Accelerated', 'Achieved', 'Architected', 'Automated', 'Built',
        'Championed', 'Consolidated', 'Created', 'Cut', 'Delivered',
        'Deployed', 'Designed', 'Developed', 'Directed', 'Doubled',
        'Drove', 'Enabled', 'Established', 'Expanded', 'Generated',
        'Grew', 'Improved', 'Implemented', 'Increased', 'Launched',
        'Led', 'Managed', 'Optimized', 'Pioneered', 'Published',
        'Raised', 'Reduced', 'Refactored', 'Scaled', 'Shipped',
        'Spearheaded', 'Streamlined', 'Transformed', 'Tripled',
    })
    _STRONG_VERBS_LOWER: frozenset = frozenset(v.lower() for v in _STRONG_VERBS)

    _WEAK_VERBS: frozenset = frozenset({
        'Assisted', 'Contributed', 'Helped', 'Participated',
        'Supported', 'Supervised', 'Worked', 'Was responsible',
        'Was involved', 'Collaborated', 'Cooperated',
    })
    _WEAK_VERBS_LOWER: frozenset = frozenset(v.lower() for v in _WEAK_VERBS)
    # First-word lookup used in check_persuasion — multi-word entries like
    # 'Was responsible' match on 'was' so passive constructions are caught.
    _WEAK_VERB_FIRST_WORDS_LOWER: frozenset = frozenset(
        v.split()[0].lower() for v in _WEAK_VERBS
    )

    _VAGUE_PHRASES: tuple = (
        'various tasks', 'multiple tasks', 'several tasks',
        'day-to-day', 'various projects', 'multiple projects',
        'various responsibilities', 'general support', 'helped to',
        'assisted with', 'participated in', 'was part of',
        'involved in', 'worked on various', 'worked on multiple',
        'responsible for', 'key player', 'hands-on experience', 'wearing many hats',
    )

    _VAGUE_PHRASES_RE = re.compile(
        r'\b(' + '|'.join(re.escape(phrase) for phrase in _VAGUE_PHRASES) + r')\b',
        re.IGNORECASE,
    )

    _METRIC_RE = re.compile(
        r'(?!(?:19|20)\d{2}(?:[–\-]\d{4})?)'  # negative lookahead: exclude year patterns like 2020-2024
        r'((?:\d{1,3}(?:[,\s]\d{3})*|\d+)\s*%?'  # digit-based metric with optional commas/spaces and %
        r'|\$[\d,]+[kmb]?'         # dollar amount
        r'|£[\d,]+[kmb]?'          # pound amount
        r'|€[\d,]+[kmb]?'          # euro amount
        r'|\b\d+\s*x\b'            # multiplier (3x)
        r'|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fifteen|twenty|hundred|thousand)\b)',  # spelled-out numbers
        re.IGNORECASE,
    )

    def check_persuasion(self, experiences: List[Dict]) -> Dict:
        """Analyse experience bullets for persuasion quality.

        Parameters
        ----------
        experiences:
            List of experience dicts (each with ``id`` and ``achievements``).

        Returns
        -------
        Dict with keys:
          - ``findings``: list of finding dicts (exp_id, bullet_index, text,
            severity, issues)
          - ``summary``: {total_bullets, flagged, strong_count}
        """
        findings = []
        total_bullets = 0
        strong_count  = 0

        for exp in experiences:
            exp_id = exp.get('id', '')
            achievements = exp.get('ordered_achievements') or exp.get('achievements') or []
            for idx, ach in enumerate(achievements):
                text = (ach.get('text', '') if isinstance(ach, dict) else str(ach)).strip()
                if not text:
                    continue
                total_bullets += 1
                issues = []
                first_word = text.split()[0] if text.split() else ''

                # Weak opening verb — exact first-word match (no prefix collisions)
                if first_word.lower() in self._WEAK_VERB_FIRST_WORDS_LOWER:
                    issues.append({
                        'type':       'weak_verb',
                        'severity':   'warning',
                        'suggestion': (
                            f'Replace "{first_word}" with a stronger action verb '
                            '(e.g. Led, Built, Delivered, Reduced, Improved).'
                        ),
                    })
                elif first_word.lower() not in self._STRONG_VERBS_LOWER:
                    issues.append({
                        'type':       'no_strong_verb',
                        'severity':   'info',
                        'suggestion': (
                            f'Consider opening with a strong action verb '
                            '(e.g. Led, Built, Delivered, Reduced, Improved).'
                        ),
                    })

                # Missing quantification
                if not self._METRIC_RE.search(text):
                    issues.append({
                        'type':       'no_metric',
                        'severity':   'warning',
                        'suggestion': (
                            'Add a quantified result — percentage improvement, '
                            'team size, dollar value, or time saved.'
                        ),
                    })

                # Vague language
                text_lower = text.lower()
                vague_matches = self._VAGUE_PHRASES_RE.findall(text_lower)
                for phrase in vague_matches:
                    issues.append({
                        'type':       'vague_language',
                        'severity':   'warning',
                        'suggestion': (
                            f'Replace vague phrase "{phrase}" with a specific, '
                            'measurable description of impact.'
                        ),
                    })

                # Too short
                if len(text.split()) < 8:
                    issues.append({
                        'type':       'too_short',
                        'severity':   'info',
                        'suggestion': (
                            'Expand this bullet to include context, action, and result '
                            '(aim for 15–25 words).'
                        ),
                    })

                if not issues:
                    strong_count += 1
                else:
                    findings.append({
                        'exp_id':       exp_id,
                        'bullet_index': idx,
                        'text':         text,
                        'severity':     max(
                            (i['severity'] for i in issues),
                            key=lambda s: 0 if s == 'info' else 1,
                        ),
                        'issues': issues,
                    })

        return {
            'findings': findings,
            'summary':  {
                'total_bullets': total_bullets,
                'flagged':       len(findings),
                'strong_count':  strong_count,
            },
        }
    
    def _add_ats_additional_sections(self, doc, content: Dict, job_analysis: Dict):
        """Add additional sections that improve ATS scoring."""
        
        # Certifications (if present)
        if content.get('certifications'):
            cert_heading = doc.add_paragraph()
            cert_heading.add_run('CERTIFICATIONS').bold = True
            cert_heading.style = 'Heading 2'
            
            for cert in content['certifications']:
                cert_name = cert.get('name', '')
                cert_issuer = cert.get('issuer', '')
                cert_year = cert.get('year', '')
                
                cert_line = cert_name
                if cert_issuer:
                    cert_line += f" | {cert_issuer}"
                if cert_year:
                    cert_line += f" ({cert_year})"
                
                doc.add_paragraph(cert_line)
            
            doc.add_paragraph()
        
        # Awards (if present and relevant)
        if content.get('awards'):
            awards_heading = doc.add_paragraph()
            awards_heading.add_run('AWARDS & RECOGNITION').bold = True
            awards_heading.style = 'Heading 2'
            
            for award in content['awards']:
                award_title = award.get('title', '')
                award_year = award.get('year', '')
                award_desc = award.get('description', '')
                
                award_line = award_title
                if award_year:
                    award_line += f" ({award_year})"
                
                award_para = doc.add_paragraph()
                award_para.add_run(award_line).bold = True
                
                if award_desc:
                    doc.add_paragraph(award_desc)
            
            doc.add_paragraph()
    
    def _validate_ats_compatibility(self, content: Dict, job_analysis: Dict) -> int:
        """Validate CV for ATS compatibility and return score out of 100."""
        score = 0
        max_score = 100
        
        # Check 1: Contact Information (20 points)
        contact = content.get('personal_info', {}).get('contact', {})
        if contact.get('email'):
            score += 8
        if contact.get('phone'):
            score += 6
        if contact.get('address') or contact.get('address_display'):
            score += 6
        
        # Check 2: Professional Summary (15 points)
        summary = content.get('summary', '')
        if len(summary) > 50:
            score += 10
        if len(summary) > 100:
            score += 5
        
        # Check 3: Skills Match (25 points)
        skills_list = [skill.get('name', '').lower() for skill in content.get('skills', [])]
        required_skills = [skill.lower() for skill in job_analysis.get('required_skills', [])]
        ats_keywords = [kw.lower() for kw in job_analysis.get('ats_keywords', [])]
        
        # Required skills coverage
        matched_required = sum(1 for skill in required_skills if skill in skills_list)
        if required_skills:
            score += int((matched_required / len(required_skills)) * 15)
        
        # ATS keywords coverage  
        matched_keywords = sum(1 for kw in ats_keywords[:10] if kw in ' '.join(skills_list))
        if ats_keywords:
            score += int((matched_keywords / min(len(ats_keywords), 10)) * 10)
        
        # Check 4: Experience Section (25 points)
        experiences = content.get('experiences', [])
        if experiences:
            score += 10
            # Check for quantified achievements
            total_achievements = sum(len(exp.get('achievements', [])) for exp in experiences)
            if total_achievements >= 8:
                score += 10
            elif total_achievements >= 4:
                score += 5
            
            # Check for recent experience
            if any('2023' in exp.get('end_date', '') or '2024' in exp.get('end_date', '') 
                  or exp.get('end_date') == 'Present' for exp in experiences):
                score += 5
        
        # Check 5: Education (10 points)
        if content.get('education'):
            score += 10
        
        # Check 6: Additional Sections (5 points)
        if content.get('certifications'):
            score += 3
        if content.get('awards'):
            score += 2
        
        return min(score, max_score)
    
    def _generate_human_docx(
        self,
        content: Dict,
        job_analysis: Dict,
        output_dir: Path
    ) -> Path:
        """Generate human-readable DOCX using python-docx with Calibri, standard margins.

        Sections (all conditional where marked):
        Name / Contact / Summary / Experience / Skills / Education /
        Certifications (if any) / Selected Publications (if any).
        """
        from docx import Document
        from docx.shared import Pt, RGBColor, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement

        company   = job_analysis.get('company', 'Company').replace(' ', '')
        role      = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename  = f"CV_{company}_{role}_{timestamp}.docx"
        filepath  = output_dir / filename

        doc = Document()

        # ── Page margins (1 inch all sides) ─────────────────────────────────
        for section in doc.sections:
            section.top_margin    = Inches(1.0)
            section.bottom_margin = Inches(1.0)
            section.left_margin   = Inches(1.0)
            section.right_margin  = Inches(1.0)

        # ── Default paragraph style: Calibri 11 ─────────────────────────────
        style = doc.styles['Normal']
        font  = style.font
        font.name = 'Calibri'
        font.size = Pt(11)

        # ── Helper functions ─────────────────────────────────────────────────
        def _heading(text: str, level: int = 1):
            p = doc.add_paragraph()
            run = p.add_run(text.upper())
            run.bold = True
            run.font.size = Pt(13 if level == 1 else 11)
            run.font.color.rgb = RGBColor(0x2c, 0x3e, 0x50)
            # Bottom border (thin rule under section heading)
            pPr = p._p.get_or_add_pPr()
            pBdr = OxmlElement('w:pBdr')
            bottom = OxmlElement('w:bottom')
            bottom.set(qn('w:val'), 'single')
            bottom.set(qn('w:sz'), '4')
            bottom.set(qn('w:space'), '1')
            bottom.set(qn('w:color'), '2c3e50')
            pBdr.append(bottom)
            pPr.append(pBdr)
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after  = Pt(2)
            return p

        def _para(text: str = '', bold: bool = False, italic: bool = False,
                  size: int = 11, indent: float = 0.0, space_after: float = 2):
            p = doc.add_paragraph()
            p.paragraph_format.space_after  = Pt(space_after)
            p.paragraph_format.space_before = Pt(0)
            if indent:
                p.paragraph_format.left_indent = Inches(indent)
            if text:
                run = p.add_run(text)
                run.bold   = bold
                run.italic = italic
                run.font.size = Pt(size)
            return p

        def _bullet(text: str):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.left_indent  = Inches(0.25)
            p.paragraph_format.space_after  = Pt(1)
            p.add_run(text)
            return p

        # ── Name ─────────────────────────────────────────────────────────────
        personal_info = content.get('personal_info', {})
        name_para = doc.add_paragraph()
        name_run  = name_para.add_run(personal_info.get('name', ''))
        name_run.bold       = True
        name_run.font.size  = Pt(22)
        name_run.font.color.rgb = RGBColor(0x2c, 0x3e, 0x50)
        name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        name_para.paragraph_format.space_after = Pt(2)

        # Job title line
        title_para = doc.add_paragraph()
        title_run  = title_para.add_run(job_analysis.get('title', ''))
        title_run.italic    = True
        title_run.font.size = Pt(12)
        title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_para.paragraph_format.space_after = Pt(4)

        # ── Contact ──────────────────────────────────────────────────────────
        contact = personal_info.get('contact', {})
        contact_parts = []
        if contact.get('email'):
            contact_parts.append(contact['email'])
        if contact.get('phone'):
            contact_parts.append(contact['phone'])
        address = contact.get('address', {})
        if address:
            city  = address.get('city', '')
            state = address.get('state', '')
            if city or state:
                contact_parts.append(f"{city}, {state}".strip(', '))
        if contact.get('linkedin'):
            contact_parts.append(contact['linkedin'].replace('https://', ''))
        if contact_parts:
            cp = doc.add_paragraph(' | '.join(contact_parts))
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cp.paragraph_format.space_after = Pt(4)
            for run in cp.runs:
                run.font.size = Pt(10)

        # ── Professional Summary ─────────────────────────────────────────────
        summary = content.get('professional_summary', '')
        if summary:
            _heading('Professional Summary')
            _para(summary, space_after=4)

        # ── Experience ───────────────────────────────────────────────────────
        experiences = content.get('experiences', [])
        if experiences:
            _heading('Experience')
            for exp in experiences:
                # Role + Company on same line, dates on right
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after  = Pt(0)
                role_run = p.add_run(exp.get('title', ''))
                role_run.bold = True
                p.add_run('  ')
                co_run = p.add_run(exp.get('company', ''))
                co_run.italic = True
                # Dates as right-aligned run (approximate via tab stop)
                date_str = f"{exp.get('start_date', '')} – {exp.get('end_date', '')}"
                p.add_run(f"   {date_str}")
                loc = exp.get('location', {})
                if isinstance(loc, dict) and (loc.get('city') or loc.get('state')):
                    _para(f"{loc.get('city', '')}, {loc.get('state', '')}".strip(', '),
                          italic=True, size=10, space_after=1)
                for ach in exp.get('achievements', []):
                    text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                    if text.strip():
                        _bullet(text)

        # ── Skills ───────────────────────────────────────────────────────────
        skills_by_category = content.get('skills_by_category', [])
        if skills_by_category:
            _heading('Technical Skills')
            for cat in skills_by_category:
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                cat_run = p.add_run(f"{cat.get('category', '')}: ")
                cat_run.bold = True
                cat_run.font.size = Pt(10)
                skills_list = cat.get('skills', [])
                skills_text = ', '.join(
                    s.get('name', s) if isinstance(s, dict) else str(s)
                    for s in skills_list
                )
                skill_run = p.add_run(skills_text)
                skill_run.font.size = Pt(10)

        # ── Education ────────────────────────────────────────────────────────
        education = content.get('education', [])
        if education:
            _heading('Education')
            for edu in education:
                degree = edu.get('degree', '')
                field  = edu.get('field', '')
                inst   = edu.get('institution', '')
                year   = edu.get('end_year') or edu.get('graduation_date', '')
                degree_str = f"{degree}, {field}" if field else degree
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                deg_run = p.add_run(degree_str)
                deg_run.bold = True
                p.add_run(f"  {inst}  ({year})")

        # ── Certifications ───────────────────────────────────────────────────
        certifications = content.get('certifications', [])
        if certifications:
            _heading('Certifications')
            for cert in certifications:
                name   = cert.get('name', '')
                issuer = cert.get('issuer', '')
                year   = cert.get('year', '')
                parts  = [name]
                if issuer:
                    parts.append(issuer)
                if year:
                    parts.append(f"({year})")
                _para(' | '.join(parts), space_after=2)

        # ── Selected Publications ────────────────────────────────────────────
        publications = content.get('publications', [])
        if publications:
            total_count = len(self.publications) if self.publications else 0
            heading_text = 'Selected Publications' if (total_count and total_count > len(publications)) else 'Publications'
            _heading(heading_text)
            for idx, pub in enumerate(publications, 1):
                citation = pub.get('formatted_citation', '')
                if citation:
                    p = doc.add_paragraph(style='List Number')
                    p.paragraph_format.space_after  = Pt(2)
                    p.paragraph_format.left_indent  = Inches(0.25)
                    run = p.add_run(citation)
                    run.font.size = Pt(10)
                    if pub.get('venue_warning'):
                        warn_run = p.add_run('  ⚠')
                        warn_run.font.size  = Pt(9)
                        warn_run.font.color.rgb = RGBColor(0xDC, 0x79, 0x00)

        doc.save(str(filepath))
        print(f"✓ Human DOCX: {filename}")
        return filepath


# ── Module-level ATS validation ──────────────────────────────────────────────

def validate_ats_report(output_dir: Path, job_analysis: Dict) -> tuple:
    """Run 16 ATS validation checks on the generated CV files.

    Args:
        output_dir:   Path to the job-specific output directory.
        job_analysis: Job analysis dict (for ATS keyword checks).

    Returns:
        ``(checks, page_count)`` where *checks* is a list of dicts:
        ``{name, label, format, status, detail}`` with status
        ``'pass' | 'warn' | 'fail'`` and *page_count* is an ``int | None``.
        *format* is ``'docx' | 'html' | 'pdf' | 'all'``.
    """
    import re as _re
    import json as _json
    import logging as _logging

    checks: List[Dict] = []

    def _chk(name: str, label: str, fmt: str, status: str, detail: str) -> None:
        checks.append({'name': name, 'label': label, 'format': fmt,
                       'status': status, 'detail': detail})

    # ── locate files ─────────────────────────────────────────────────────────
    ats_docx_files = sorted(output_dir.glob('*_ATS.docx'))
    html_files     = sorted(output_dir.glob('*.html'))
    pdf_files      = sorted(f for f in output_dir.glob('*.pdf')
                            if '_ATS' not in f.name)

    ats_docx  = ats_docx_files[0] if ats_docx_files else None
    html_path = html_files[0]     if html_files     else None
    pdf_path  = pdf_files[0]      if pdf_files      else None

    # ── DOCX checks 1-8, 16 ──────────────────────────────────────────────────
    DOCX_CHECKS = [
        ('docx_text_selectable',       'DOCX text selectable'),
        ('docx_zero_tables',           'No tables in DOCX'),
        ('docx_zero_shapes',           'No text boxes / shapes'),
        ('docx_contact_in_body',       'Contact info in body'),
        ('docx_standard_headings',     'Standard heading text'),
        ('docx_heading1_present',      'Heading 1 style present'),
        ('docx_date_format_consistent','Consistent date formats'),
        ('ats_keyword_presence',       'ATS keyword presence'),
        ('docx_publications_heading',  'Publications heading text'),
    ]

    if ats_docx is None:
        for name, label in DOCX_CHECKS:
            fmt = 'all' if name == 'ats_keyword_presence' else 'docx'
            _chk(name, label, fmt, 'fail', 'ATS DOCX file not found')
    else:
        try:
            from docx import Document as _Document
            doc        = _Document(str(ats_docx))
            paragraphs = doc.paragraphs
            docx_text  = '\n'.join(p.text for p in paragraphs if p.text.strip())

            # 1 — text selectable
            if len(docx_text) > 100:
                _chk('docx_text_selectable', 'DOCX text selectable', 'docx',
                     'pass', f'{len(docx_text):,} characters extracted')
            else:
                _chk('docx_text_selectable', 'DOCX text selectable', 'docx',
                     'fail', 'Little or no text extracted — document may be image-based')

            # 2 — zero tables
            n_tables = len(doc.tables)
            if n_tables == 0:
                _chk('docx_zero_tables', 'No tables in DOCX', 'docx', 'pass', 'No tables found')
            else:
                _chk('docx_zero_tables', 'No tables in DOCX', 'docx', 'fail',
                     f'{n_tables} table(s) — ATS parsers may skip table content')

            # 3 — zero shapes
            from docx.oxml.ns import qn as _qn
            shapes = (doc.element.body.findall('.//' + _qn('v:textbox')) +
                      doc.element.body.findall('.//' + _qn('mc:Fallback')))
            if not shapes:
                _chk('docx_zero_shapes', 'No text boxes / shapes', 'docx', 'pass', 'No shapes found')
            else:
                _chk('docx_zero_shapes', 'No text boxes / shapes', 'docx', 'warn',
                     f'{len(shapes)} shape element(s) — content may be unreadable by ATS')

            # 4 — contact in body
            email_re = _re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b')
            if email_re.search(docx_text):
                _chk('docx_contact_in_body', 'Contact info in body', 'docx', 'pass',
                     'Email address found in document body')
            else:
                _chk('docx_contact_in_body', 'Contact info in body', 'docx', 'fail',
                     'No email address in body text — ATS may miss contact info')

            # 5 & 6 — headings
            STANDARD = frozenset({
                'experience', 'education', 'skills', 'summary', 'publications',
                'certifications', 'achievements', 'awards', 'objective',
                'work experience', 'professional experience', 'technical skills',
                'professional summary', 'selected publications', 'publications', 'contact',
                'portfolio', 'languages', 'volunteering', 'projects', 'career history',
            })
            heading_paras = [p for p in paragraphs if p.style.name.startswith('Heading')]
            heading_texts = [p.text.strip() for p in heading_paras if p.text.strip()]

            # Check if a heading matches a standard heading with word boundaries
            def is_standard_heading(text: str, standards: frozenset) -> bool:
                text_lower = text.lower()
                # Exact match
                if text_lower in standards:
                    return True
                # Word-boundary match: check if any standard heading appears as a complete word
                for standard in standards:
                    if _re.search(r'\b' + _re.escape(standard) + r'\b', text_lower):
                        return True
                return False

            unexpected    = [t for t in heading_texts
                             if not is_standard_heading(t, STANDARD)]
            if not unexpected:
                _chk('docx_standard_headings', 'Standard heading text', 'docx', 'pass',
                     f'{len(heading_texts)} standard section heading(s) found')
            else:
                _chk('docx_standard_headings', 'Standard heading text', 'docx', 'warn',
                     f'Unexpected heading(s): {", ".join(unexpected[:3])}')

            h1_count = sum(1 for p in heading_paras if p.style.name == 'Heading 1')
            if h1_count > 0:
                _chk('docx_heading1_present', 'Heading 1 style present', 'docx', 'pass',
                     f'{h1_count} Heading 1 paragraph(s) found')
            else:
                _chk('docx_heading1_present', 'Heading 1 style present', 'docx', 'warn',
                     'No Heading 1 paragraphs — ATS relies on heading hierarchy')

            # 7 — consistent dates
            date_pats = [
                (_re.compile(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b'),
                 'Mon YYYY'),
                (_re.compile(r'\b\d{1,2}/\d{4}\b'), 'MM/YYYY'),
                (_re.compile(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b'),
                 'Full Month YYYY'),
                (_re.compile(r'\b\d{4}-\d{2}(?:-\d{2})?\b'), 'ISO (YYYY-MM or YYYY-MM-DD)'),
                (_re.compile(r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December).*?(?:–|-|—).*?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|Present|Current)'),
                 'Date Range'),
                (_re.compile(r'\b(?:Present|Current)\b', _re.IGNORECASE), 'Present/Current'),
            ]
            found_fmts = {name for pat, name in date_pats if pat.search(docx_text)}
            if len(found_fmts) <= 1:
                _chk('docx_date_format_consistent', 'Consistent date formats', 'docx', 'pass',
                     f'Date format: {next(iter(found_fmts), "not detected")}')
            else:
                _chk('docx_date_format_consistent', 'Consistent date formats', 'docx', 'fail',
                     f'Mixed formats — {" and ".join(sorted(found_fmts))} — standardise to one')

            # 8 — ATS keywords
            ats_kws = [k.lower() for k in job_analysis.get('ats_keywords', [])[:15]]
            if not ats_kws:
                _chk('ats_keyword_presence', 'ATS keyword presence', 'all', 'warn',
                     'No ATS keywords defined in job analysis')
            else:
                text_lower = docx_text.lower()
                missing = [kw for kw in ats_kws if kw not in text_lower]
                if not missing:
                    _chk('ats_keyword_presence', 'ATS keyword presence', 'all', 'pass',
                         f'All {len(ats_kws)} ATS keywords present')
                elif len(missing) <= max(1, len(ats_kws) // 3):
                    _chk('ats_keyword_presence', 'ATS keyword presence', 'all', 'warn',
                         f'{len(missing)} keyword(s) missing: {", ".join(missing[:5])}')
                else:
                    _chk('ats_keyword_presence', 'ATS keyword presence', 'all', 'fail',
                         (f'{len(missing)}/{len(ats_kws)} keywords missing: '
                          f'{", ".join(missing[:5])}{"…" if len(missing) > 5 else ""}'))

            # 16 — publications heading
            pub_headings = [p for p in heading_paras if 'publication' in p.text.lower()]
            if not pub_headings:
                _chk('docx_publications_heading', 'Publications heading text', 'docx', 'pass',
                     'No publications section (optional)')
            else:
                wrong = [p.text.strip() for p in pub_headings
                         if p.text.strip() != 'Publications']
                if not wrong:
                    _chk('docx_publications_heading', 'Publications heading text', 'docx',
                         'pass', 'Heading reads exactly "Publications"')
                else:
                    _chk('docx_publications_heading', 'Publications heading text', 'docx',
                         'fail', f'Heading "{wrong[0]}" must be exactly "Publications"')

        except Exception as exc:
            for name, label in DOCX_CHECKS:
                fmt = 'all' if name == 'ats_keyword_presence' else 'docx'
                _chk(name, label, fmt, 'fail', f'DOCX check error: {exc}')

    # ── HTML checks 9-12 ─────────────────────────────────────────────────────
    HTML_CHECKS = [
        ('html_jsonld_present',       'HTML JSON-LD present'),
        ('html_jsonld_valid_person',  'JSON-LD is schema.org/Person'),
        ('html_jsonld_knows_about',   'JSON-LD knowsAbout populated'),
        ('html_required_fields',      'JSON-LD name + email present'),
    ]
    if html_path is None:
        for name, label in HTML_CHECKS:
            _chk(name, label, 'html', 'fail', 'HTML file not found')
    else:
        try:
            from bs4 import BeautifulSoup as _BS
            html_src    = html_path.read_text(encoding='utf-8', errors='replace')
            soup        = _BS(html_src, 'html.parser')
            jsonld_tags = soup.find_all('script', type='application/ld+json')

            if not jsonld_tags:
                for name, label in HTML_CHECKS:
                    _chk(name, label, 'html', 'fail', 'No JSON-LD <script> block found')
            else:
                _chk('html_jsonld_present', 'HTML JSON-LD present', 'html', 'pass',
                     f'{len(jsonld_tags)} JSON-LD block(s) found')
                try:
                    jld = _json.loads(jsonld_tags[0].string or '{}')
                    # 10
                    if (jld.get('@type') == 'Person' and
                            str(jld.get('@context', '')).startswith('https://schema.org')):
                        _chk('html_jsonld_valid_person', 'JSON-LD is schema.org/Person',
                             'html', 'pass', '@type: Person with schema.org context')
                    else:
                        _chk('html_jsonld_valid_person', 'JSON-LD is schema.org/Person',
                             'html', 'fail',
                             f'@type="{jld.get("@type","missing")}", expected Person')
                    # 11
                    ka = jld.get('knowsAbout', [])
                    if len(ka) >= 3:
                        _chk('html_jsonld_knows_about', 'JSON-LD knowsAbout populated',
                             'html', 'pass', f'{len(ka)} skills listed')
                    elif ka:
                        _chk('html_jsonld_knows_about', 'JSON-LD knowsAbout populated',
                             'html', 'warn', f'Only {len(ka)} skill(s) in knowsAbout')
                    else:
                        _chk('html_jsonld_knows_about', 'JSON-LD knowsAbout populated',
                             'html', 'fail', 'knowsAbout absent or empty')
                    # 12
                    missing_flds = [f for f in ('name', 'email') if not jld.get(f, '').strip()]
                    if not missing_flds:
                        _chk('html_required_fields', 'JSON-LD name + email present',
                             'html', 'pass',
                             f'name="{jld.get("name","")}", email="{jld.get("email","")}"')
                    else:
                        _chk('html_required_fields', 'JSON-LD name + email present',
                             'html', 'fail',
                             f'Missing required fields: {", ".join(missing_flds)}')
                except _json.JSONDecodeError as exc:
                    for name, label in HTML_CHECKS[1:]:
                        _chk(name, label, 'html', 'fail', f'JSON-LD parse error: {exc}')

        except Exception as exc:
            for name, label in HTML_CHECKS:
                _chk(name, label, 'html', 'fail', f'HTML check error: {exc}')

    # ── WeasyPrint render checks 13, 15 ──────────────────────────────────────
    page_count: Optional[int] = None
    if html_path is None:
        _chk('html_renders_ok',   'HTML renders without error',      'pdf', 'fail', 'HTML file not found')
        _chk('pdf_no_clipping',   'No WeasyPrint clipping warnings', 'pdf', 'fail', 'HTML file not found')
    else:
        wp_warnings: List[str] = []

        class _WPCapture(_logging.Handler):
            def emit(self, record: _logging.LogRecord) -> None:
                wp_warnings.append(record.getMessage())

        wp_logger = _logging.getLogger('weasyprint')
        _handler  = _WPCapture()
        _handler.setLevel(_logging.WARNING)
        wp_logger.addHandler(_handler)
        try:
            import weasyprint as _wp
            html_str  = html_path.read_text(encoding='utf-8', errors='replace')
            rendered  = _wp.HTML(string=html_str,
                                 base_url=str(html_path.parent)).render()
            page_count = len(rendered.pages)
            _chk('html_renders_ok', 'HTML renders without error', 'pdf', 'pass',
                 f'Rendered {page_count} page(s) successfully')
            clip_warns = [w for w in wp_warnings
                          if 'clip' in w.lower() or 'overflow' in w.lower()]
            if not clip_warns:
                _chk('pdf_no_clipping', 'No WeasyPrint clipping warnings', 'pdf', 'pass',
                     'No clipping or overflow warnings')
            else:
                _chk('pdf_no_clipping', 'No WeasyPrint clipping warnings', 'pdf', 'warn',
                     f'{len(clip_warns)} clipping warning(s): {clip_warns[0][:100]}')
        except Exception as exc:
            _chk('html_renders_ok', 'HTML renders without error', 'pdf', 'fail',
                 f'WeasyPrint error: {str(exc)[:200]}')
            _chk('pdf_no_clipping', 'No WeasyPrint clipping warnings', 'pdf', 'fail',
                 'HTML render failed')
        finally:
            wp_logger.removeHandler(_handler)

    # ── PDF size check 14 ────────────────────────────────────────────────────
    if pdf_path is None:
        _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'fail', 'PDF file not found')
    else:
        try:
            import pypdf as _pypdf
            reader = _pypdf.PdfReader(str(pdf_path))
            if reader.pages:
                w = float(reader.pages[0].mediabox.width)
                h = float(reader.pages[0].mediabox.height)
                # Normalise to portrait
                w, h = min(w, h), max(w, h)
                if abs(w - 612) < 6 and abs(h - 792) < 6:
                    _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'pass',
                         f'{w:.0f}×{h:.0f} pts — Letter')
                elif abs(w - 595) < 6 and abs(h - 842) < 6:
                    _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'warn',
                         f'{w:.0f}×{h:.0f} pts — appears A4, not US Letter')
                else:
                    _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'warn',
                         f'{w:.0f}×{h:.0f} pts — unexpected page size')
            else:
                _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'fail', 'PDF has no pages')
        except Exception as exc:
            _chk('pdf_us_letter', 'PDF page size is US Letter', 'pdf', 'fail',
                 f'PDF check error: {exc}')

    # ── Page Count Validation ──────────────────────────────────────────────
    # Check CV length against ideal and absolute limits
    cfg = get_config()
    ideal_min = cfg.get('generation.page_count.ideal_min', 2)
    ideal_max = cfg.get('generation.page_count.ideal_max', 3)
    absolute_max = cfg.get('generation.page_count.absolute_max', 4)

    if page_count is None:
        _chk('cv_page_count', 'CV page count', 'pdf', 'fail',
             'Page count could not be determined (HTML render failed)')
    elif page_count == 1:
        _chk('cv_page_count', 'CV page count', 'pdf', 'warn',
             f'{page_count} page — consider {ideal_min}–{ideal_max} pages for senior candidates')
    elif ideal_min <= page_count <= ideal_max:
        _chk('cv_page_count', 'CV page count', 'pdf', 'pass',
             f'{page_count} pages — within ideal {ideal_min}–{ideal_max} page range')
    elif page_count > absolute_max:
        _chk('cv_page_count', 'CV page count', 'pdf', 'fail',
             f'{page_count} pages — exceeds {absolute_max}-page maximum; consider condensing')
    else:  # ideal_max < page_count <= absolute_max
        _chk('cv_page_count', 'CV page count', 'pdf', 'warn',
             f'{page_count} pages — exceeds {ideal_max}-page ideal range')

    return checks, page_count
