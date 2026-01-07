"""
CV Orchestrator - Bridges LLM intelligence with document generation utilities.

This module coordinates between:
- LLM-driven content selection
- Traditional utility functions (scoring, formatting)
- Document generation (DOCX/PDF)
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

# Import existing utilities
from .scoring import (
    calculate_relevance_score,
    rank_content,
    select_best_summary,
    calculate_skill_score
)
from .bibtex_parser import parse_bibtex_file, format_publication
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
        self.master_data_path = Path(master_data_path)
        self.publications_path = Path(publications_path)
        self.output_dir = Path(output_dir)
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
    
    def generate_cv(
        self,
        job_analysis: Dict,
        customizations: Dict
    ) -> Dict:
        """
        Generate CV files based on LLM analysis and recommendations.
        
        Returns:
            Dict with output_dir, files created, metadata
        """
        # Create output directory
        company = job_analysis.get('company', 'Company')
        role = job_analysis.get('title', 'Role')
        role_slug = role.replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        
        output_name = f"{company}_{role_slug}_{timestamp}"
        job_output_dir = self.output_dir / output_name
        job_output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Output directory: {job_output_dir}")
        
        # Select content using hybrid approach (LLM + scoring)
        selected_content = self._select_content_hybrid(
            job_analysis,
            customizations
        )
        
        # Generate documents
        files_created = []
        
        # 1. ATS-optimized DOCX
        ats_file = self._generate_ats_docx(
            selected_content,
            job_analysis,
            job_output_dir
        )
        files_created.append(ats_file.name)
        
        # 2. Human-readable PDF
        human_pdf = self._generate_human_pdf(
            selected_content,
            job_analysis,
            job_output_dir
        )
        files_created.append(human_pdf.name)
        
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
            'company': company,
            'role': role,
            'job_analysis': job_analysis,
            'customizations': customizations,
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
        
        - LLM provides recommendations
        - Scoring functions validate and rank
        - Combine for best results
        """
        # Extract recommended IDs from LLM
        recommended_exp_ids = set(customizations.get('recommended_experiences', []))
        recommended_achievement_ids = set(customizations.get('recommended_achievements', []))
        recommended_skills = set(customizations.get('recommended_skills', []))
        
        # Get all content
        all_experiences = self.master_data.get('experience', [])
        all_achievements = self.master_data.get('selected_achievements', [])
        all_skills = self.master_data.get('skills', [])
        
        # Use LLM semantic matching + keyword scoring
        job_keywords = set(job_analysis.get('ats_keywords', []))
        job_requirements = (
            job_analysis.get('must_have_requirements', []) +
            job_analysis.get('nice_to_have_requirements', [])
        )
        
        # Score experiences
        scored_experiences = []
        for exp in all_experiences:
            exp_id = exp.get('id', '')
            
            # LLM recommendation bonus
            llm_score = 10.0 if exp_id in recommended_exp_ids else 0.0
            
            # Keyword score
            exp_text = json.dumps(exp)
            keyword_score = calculate_relevance_score(exp_text, job_keywords)
            
            # Semantic score from LLM
            semantic_score = self.llm.semantic_match(exp_text, job_requirements) * 10
            
            # Combined score
            total_score = llm_score + keyword_score + semantic_score
            
            scored_experiences.append((exp, total_score))
        
        # Sort and select top experiences
        scored_experiences.sort(key=lambda x: x[1], reverse=True)
        selected_experiences = [exp for exp, score in scored_experiences[:4]]
        
        # Score achievements
        scored_achievements = []
        for ach in all_achievements:
            ach_id = ach.get('id', '')
            
            llm_score = 10.0 if ach_id in recommended_achievement_ids else 0.0
            ach_text = json.dumps(ach)
            keyword_score = calculate_relevance_score(ach_text, job_keywords)
            semantic_score = self.llm.semantic_match(ach_text, job_requirements) * 10
            
            total_score = llm_score + keyword_score + semantic_score
            scored_achievements.append((ach, total_score))
        
        scored_achievements.sort(key=lambda x: x[1], reverse=True)
        selected_achievements = [ach for ach, score in scored_achievements[:5]]
        
        # Select skills (prioritize LLM recommendations)
        selected_skills = []
        for skill in all_skills:
            skill_name = skill.get('name', '')
            if skill_name in recommended_skills:
                selected_skills.append(skill)
        
        # Add additional skills by scoring if needed
        if len(selected_skills) < 20:
            for skill in all_skills:
                if skill not in selected_skills:
                    skill_score = calculate_skill_score(
                        skill,
                        job_keywords,
                        job_analysis.get('required_skills', [])
                    )
                    if skill_score > 5:
                        selected_skills.append(skill)
                    if len(selected_skills) >= 20:
                        break
        
        # Select professional summary
        summaries = self.master_data.get('professional_summaries', {})
        summary_key = customizations.get('summary_focus', 'default')
        selected_summary = summaries.get(summary_key) or summaries.get('default', '')
        
        # Select publications
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
            
            scored_pubs.append((pub, score))
        
        scored_pubs.sort(key=lambda x: x[1], reverse=True)
        
        selected = []
        for pub, score in scored_pubs[:max_count]:
            formatted = format_publication(pub, style='brief')
            selected.append({
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
        """Generate ATS-optimized DOCX."""
        from docx import Document
        from docx.shared import Pt
        
        doc = Document()
        
        # Contact info
        personal = content['personal_info']
        doc.add_heading(personal.get('name', ''), level=1)
        
        contact = personal.get('contact', {})
        contact_line = f"{contact.get('email', '')} | {contact.get('phone', '')}"
        if contact.get('linkedin'):
            contact_line += f" | {contact['linkedin']}"
        doc.add_paragraph(contact_line)
        
        # Professional Summary
        doc.add_heading('Professional Summary', level=2)
        doc.add_paragraph(content['summary'])
        
        # Work Experience
        doc.add_heading('Work Experience', level=2)
        for exp in content['experiences']:
            title_para = doc.add_paragraph()
            title_para.add_run(f"{exp['title']} | {exp['company']}").bold = True
            doc.add_paragraph(f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}")
            
            for achievement in exp.get('achievements', []):
                if isinstance(achievement, dict):
                    doc.add_paragraph(achievement.get('text', achievement.get('description', '')), style='List Bullet')
                else:
                    doc.add_paragraph(achievement, style='List Bullet')
        
        # Skills
        doc.add_heading('Skills', level=2)
        skills_text = ', '.join(skill.get('name', '') for skill in content['skills'])
        doc.add_paragraph(skills_text)
        
        # Education
        doc.add_heading('Education', level=2)
        for edu in content['education']:
            edu_line = f"{edu.get('degree', '')} {edu.get('field', '')} – {edu.get('institution', '')} ({edu.get('end_year', '')})"
            doc.add_paragraph(edu_line)
        
        # Save
        company = job_analysis.get('company', 'Company').replace(' ', '')
        role = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        
        filename = f"CV_{company}_{role}_{timestamp}_ATS.docx"
        filepath = output_dir / filename
        doc.save(str(filepath))
        
        print(f"✓ Generated ATS DOCX: {filename}")
        return filepath
    
    def _generate_human_pdf(
        self,
        content: Dict,
        job_analysis: Dict,
        output_dir: Path
    ) -> Path:
        """Generate human-readable PDF with styling."""
        # TODO: Implement HTML→PDF with WeasyPrint
        # For now, create placeholder
        company = job_analysis.get('company', 'Company').replace(' ', '')
        role = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        
        filename = f"CV_{company}_{role}_{timestamp}_Human.pdf"
        filepath = output_dir / filename
        
        # Placeholder
        filepath.write_text("PDF generation coming soon", encoding='utf-8')
        print(f"⚠ Human PDF placeholder: {filename}")
        
        return filepath
    
    def _generate_human_docx(
        self,
        content: Dict,
        job_analysis: Dict,
        output_dir: Path
    ) -> Path:
        """Generate human-readable DOCX with styling."""
        # Similar to ATS but with better formatting
        # TODO: Implement styled version
        company = job_analysis.get('company', 'Company').replace(' ', '')
        role = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        timestamp = datetime.now().strftime("%Y-%m-%d")
        
        filename = f"CV_{company}_{role}_{timestamp}_Human.docx"
        filepath = output_dir / filename
        
        # For now, reuse ATS generation
        from docx import Document
        doc = Document()
        doc.add_paragraph("Human-readable DOCX coming soon")
        doc.save(str(filepath))
        
        print(f"⚠ Human DOCX placeholder: {filename}")
        return filepath
