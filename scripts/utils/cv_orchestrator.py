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
    
    def _load_master_data(self) -> Dict:
        """Load Master_CV_Data.json."""
        if not self.master_data_path.exists():
            raise FileNotFoundError(
                f"Master data file not found: {self.master_data_path}\n"
                "Please create Master_CV_Data.json first."
            )
        
        with open(self.master_data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _prepare_cv_data_for_template(
        self,
        selected_content: Dict,
        job_analysis: Dict,
        template_variant: str = 'standard'
    ) -> Dict:
        """Prepare CV data in the format expected by the HTML resume template."""
        
        # Get personal info from selected content
        personal_info = selected_content.get('personal_info', {})
        
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
            'experiences': selected_content.get('experiences', []),
            'education': selected_content.get('education', []),
            'skills_by_category': skills_by_category,
            'awards': awards,
            'certifications': certifications,
            'publications': publications,
            'template_metadata': template_metadata
        }
        
        return cv_data
    
    def _organize_skills_by_category(self, skills: List[Dict], variant: str) -> List[Dict]:
        """Organize skills by category."""
        if not skills:
            return []
        
        category_skills = defaultdict(list)
        for skill in skills:
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
        formatted_pubs = []
        for pub in publications:
            if isinstance(pub, dict):
                if 'formatted' in pub:
                    formatted_pubs.append({
                        'formatted_citation': pub['formatted']
                    })
                elif 'title' in pub:
                    # Create basic formatted citation
                    authors = pub.get('authors', 'Unknown')
                    title = pub.get('title', '')
                    journal = pub.get('journal', '')
                    year = pub.get('year', '')
                    citation = f"{authors}. {title}. {journal} ({year}).".strip()
                    formatted_pubs.append({
                        'formatted_citation': citation
                    })
        return formatted_pubs
    
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
        """Convert HTML file to PDF using WeasyPrint."""
        try:
            # Use WeasyPrint for PDF conversion
            weasyprint.HTML(filename=str(html_file)).write_pdf(str(pdf_output))
            print(f"✓ Generated PDF using WeasyPrint: {pdf_output.name}")
            
        except Exception as e:
            print(f"⚠ WeasyPrint failed ({e}), trying alternative approach...")
            
            # Alternative: try Chrome headless if available
            try:
                subprocess.run([
                    'google-chrome', '--headless', '--disable-gpu', '--virtual-time-budget=5000',
                    '--print-to-pdf=' + str(pdf_output),
                    '--print-to-pdf-no-header',
                    str(html_file)
                ], check=True)
                print(f"✓ Generated PDF using Chrome headless: {pdf_output.name}")
                
            except (subprocess.CalledProcessError, FileNotFoundError):
                # Final fallback: create a text file with instructions
                fallback_content = f"""
PDF Generation Failed

The system attempted to generate a PDF but encountered issues:
1. WeasyPrint error: {e}
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

    def propose_rewrites(self, content: Dict, job_analysis: Dict) -> List[Dict]:
        """Propose targeted text rewrites to align CV terminology with the job.

        Delegates to the LLM provider's ``propose_rewrites`` implementation.
        Returns ``[]`` (with a logged warning) when no LLM client is configured
        so the caller can degrade gracefully.

        Args:
            content:      Selected CV content dict from
                          :meth:`_select_content_hybrid`.
            job_analysis: Output of the LLM job-description analysis.

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
        return self.llm.propose_rewrites(content, job_analysis)

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

    # ── CV generation ─────────────────────────────────────────────────────────

    def generate_cv(
        self,
        job_analysis: Dict,
        customizations: Dict,
        output_dir: Optional[Path] = None,
        approved_rewrites: Optional[List[Dict]] = None,
        rewrite_audit: Optional[List[Dict]] = None,
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
        
        # Select content using hybrid approach (LLM + scoring)
        selected_content = self._select_content_hybrid(
            job_analysis,
            customizations
        )

        # Apply any user-approved text rewrites before rendering
        selected_content = self.apply_approved_rewrites(
            selected_content, approved_rewrites or []
        )

        # Prepare template data once — shared by all format generators.
        # JSON-LD is built here and embedded directly in cv-template.html,
        # so the single HTML output is both ATS-compatible and print-ready.
        cv_data = self._prepare_cv_data_for_template(selected_content, job_analysis)
        cv_data['achievements'] = selected_content.get('achievements', [])
        cv_data['json_ld_str']  = self._build_json_ld(cv_data, job_analysis)

        # Generate documents
        files_created = []

        # 1. ATS-optimized DOCX
        ats_file = self._generate_ats_docx(
            selected_content,
            job_analysis,
            job_output_dir
        )
        files_created.append(ats_file.name)

        # 2. Single HTML (ATS metadata embedded) + PDF both rendered from it
        html_path, pdf_path = self._generate_human_pdf(
            cv_data,
            job_analysis,
            job_output_dir
        )
        if html_path is not None:
            files_created.append(html_path.name)
        files_created.append(pdf_path.name)

        # 3. Human-readable DOCX
        human_docx = self._generate_human_docx(
            selected_content,
            job_analysis,
            job_output_dir
        )
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
            'metadata': metadata
        }
    
    def _select_content_hybrid(
        self,
        job_analysis: Dict,
        customizations: Dict
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
        omitted_exp_ids  = set(customizations.get('omitted_experiences', []))
        omitted_skill_names = set(customizations.get('omitted_skills', []))

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
        max_skills = cfg.get('generation.max_skills', 20)

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
            if self.llm:
                semantic_score = self.llm.semantic_match(json.dumps(exp), job_requirements) * 10

            scored_experiences.append((exp, llm_score + keyword_score + semantic_score))

        scored_experiences.sort(key=lambda x: x[1], reverse=True)
        selected_experiences = [exp for exp, _ in scored_experiences]

        # ── Achievements ──────────────────────────────────────────────────────
        scored_achievements = []
        for ach in all_achievements:
            ach_id = ach.get('id', '')
            if ach_id in omitted_exp_ids:  # achievements share the omit set
                continue

            llm_score     = 10.0 if ach_id in recommended_achievement_ids else 0.0
            keyword_score = calculate_relevance_score(ach, job_keywords, job_requirements, domain)
            semantic_score = 0.0
            if self.llm:
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
        
        # Select professional summary
        summaries = self.master_data.get('professional_summaries', {})
        summary_key = customizations.get('summary_focus', 'default')
        selected_summary = summaries.get(summary_key) or summaries.get('default', '')

        # Select publications — honour user accept/reject decisions if present
        accepted_pubs = customizations.get('accepted_publications')  # list of cite_keys or None
        rejected_pubs = set(customizations.get('rejected_publications') or [])

        if accepted_pubs is not None:
            # User has explicitly selected publications — use their ordered list
            accepted_set = set(accepted_pubs)
            selected_publications = []
            for pub in self._select_publications(job_analysis, max_count=len(self.publications) if self.publications else 50):
                key = pub.get('key', '') or ''
                if key in accepted_set and key not in rejected_pubs:
                    selected_publications.append(pub)
                    if len(selected_publications) >= 15:
                        break
        else:
            selected_publications = self._select_publications(job_analysis, max_count=10)
        
        return {
            'personal_info': self.master_data.get('personal_info', {}),
            'summary': selected_summary,
            'experiences': selected_experiences,
            'achievements': selected_achievements,
            'skills': selected_skills,
            'education': self.master_data.get('education', []),
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
        
        # Name header - clear and prominent
        name_para = doc.add_paragraph()
        name_run = name_para.add_run(name)
        name_run.font.size = Pt(16)
        name_run.font.bold = True
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

        Only reorders and selects skills — terminology is never renamed here.
        All vocabulary changes must come via :meth:`apply_approved_rewrites`
        before content reaches this method.
        """
        ats_keywords = set(kw.lower() for kw in job_analysis.get('ats_keywords', []))
        required_skills = set(skill.lower() for skill in job_analysis.get('required_skills', []))
        
        # Priority scoring for skills
        skill_scores = []
        for skill in skills:
            name = skill.get('name', '')
            name_lower = name.lower()
            years = skill.get('years', 0)
            
            score = 0
            # High priority for exact keyword matches
            if name_lower in ats_keywords:
                score += 50
            if name_lower in required_skills:
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

        _ACTION_VERBS = {
            'Developed', 'Led', 'Implemented', 'Managed', 'Created',
            'Improved', 'Reduced', 'Increased', 'Optimized', 'Designed',
            'Built', 'Established', 'Delivered', 'Drove', 'Launched',
            'Deployed', 'Architected', 'Automated', 'Spearheaded',
        }
        text = achievement.strip()
        if not any(text.startswith(v) for v in _ACTION_VERBS):
            print(
                f"Warning: _enhance_achievement_for_ats: bullet does not start "
                f"with a strong action verb: {text[:60]!r}"
            )

        return text
    
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
            heading_text = 'Selected Publications'
            if total_count and total_count > len(publications):
                heading_text = f'Selected Publications ({len(publications)} of {total_count})'
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