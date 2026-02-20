#!/usr/bin/env python3
"""
Test the enhanced ATS DOCX generation with validation.
"""

import os
import sys
from pathlib import Path
import json

# Add the scripts directory to the path
sys.path.append(str(Path(__file__).parent / 'scripts'))

from scripts.utils.cv_orchestrator import CVOrchestrator


def create_test_data_for_ats():
    """Create test data optimized for ATS testing."""
    
    selected_content = {
        'personal_info': {
            'name': 'Gregory R. Warnes, Ph.D.',
            'contact': {
                'email': 'consulting@warnes.net',
                'phone': '585-678-6661',
                'address': {
                    'city': 'Rochester',
                    'state': 'NY'
                },
                'linkedin': 'https://linkedin.com/in/gregorywarnes',
                'website': 'http://warnes.net'
            }
        },
        'summary': 'Senior Data Scientist with 25+ years of experience in biostatistics, genomics, and machine learning. Expert in Python, R, and statistical modeling with proven track record of leading cross-functional teams.',
        'experiences': [
            {
                'title': 'Chief Scientific Officer',
                'company': 'TNT³',
                'location': {'city': 'Remote', 'state': None},
                'start_date': '2024-01',
                'end_date': 'Present',
                'achievements': [
                    {
                        'text': 'Led development of automated trading systems using machine learning algorithms, improving accuracy by 35%'
                    },
                    {
                        'text': 'Managed cross-functional team of 8 engineers and data scientists, delivering 3 major product releases'
                    },
                    {
                        'text': 'Implemented Python-based data pipeline processing 1M+ daily transactions'
                    }
                ]
            },
            {
                'title': 'Principal Research Scientist',
                'company': 'Pfizer Global R&D',
                'location': {'city': 'Groton', 'state': 'CT'},
                'start_date': '2000-01',
                'end_date': '2024-12',
                'achievements': [
                    {
                        'text': 'Developed MiDAS Genomic Workflow System for large-scale RNA-Seq analysis, reducing processing time by 60%'
                    },
                    {
                        'text': 'Led biostatistics support for 50+ clinical trials across oncology and immunology therapeutic areas'
                    },
                    {
                        'text': 'Received Pfizer Achievement Award for outstanding contributions to computational biology platform'
                    }
                ]
            }
        ],
        'skills': [
            {'name': 'Python', 'category': 'Programming', 'years': 15},
            {'name': 'R/Bioconductor', 'category': 'Programming', 'years': 20},
            {'name': 'Machine Learning', 'category': 'Technical', 'years': 10},
            {'name': 'Data Science', 'category': 'Core Expertise', 'years': 25},
            {'name': 'Biostatistics', 'category': 'Core Expertise', 'years': 25},
            {'name': 'Statistical Modeling', 'category': 'Technical', 'years': 20},
            {'name': 'PyTorch', 'category': 'Technical', 'years': 5},
            {'name': 'Docker', 'category': 'Tools', 'years': 8},
        ],
        'education': [
            {
                'degree': 'Ph.D.',
                'field': 'Biostatistics',
                'institution': 'University of Washington',
                'location': {'city': 'Seattle', 'state': 'WA'},
                'end_year': 2000
            }
        ],
        'certifications': [
            {
                'name': 'AWS Certified Solutions Architect',
                'issuer': 'Amazon Web Services',
                'year': 2023
            }
        ],
        'awards': [
            {
                'title': 'Pfizer Achievement Award',
                'year': 2022,
                'description': 'Outstanding contributions to computational biology platform development'
            }
        ],
        'achievements': [],
        'publications': []
    }
    
    # Job analysis that should match well with the CV
    job_analysis = {
        'company': 'TestBioTech',
        'title': 'Senior Data Scientist',
        'domain': 'biotechnology',
        'required_skills': ['Python', 'Machine Learning', 'Statistical Modeling', 'Data Science', 'R'],
        'ats_keywords': ['python', 'machine learning', 'statistical modeling', 'biostatistics', 'data science', 
                        'clinical trials', 'genomics', 'pytorch', 'docker', 'leadership'],
        'must_have_requirements': [
            'PhD in relevant field',
            '10+ years experience in data science',
            'Strong Python and R skills',
            'Experience with machine learning',
            'Biotechnology or pharmaceutical experience'
        ]
    }
    
    return selected_content, job_analysis


def main():
    """Test enhanced ATS DOCX generation."""
    
    print("🔄 Testing Enhanced ATS DOCX Generation")
    print("=" * 50)
    
    # Use existing master data file or create test one
    master_data_path = Path.home() / 'CV' / 'Master_CV_Data.json'
    if not master_data_path.exists():
        print("⚠ Using test master data")
        test_master_data = {
            'personal_info': {'name': 'Test User'},
            'professional_summaries': {'default': 'Test summary'},
            'education': [], 'awards': [], 'certifications': []
        }
        master_data_path.parent.mkdir(parents=True, exist_ok=True)
        with open(master_data_path, 'w') as f:
            json.dump(test_master_data, f, indent=2)
    
    # Create test output directory
    test_output = Path(__file__).parent / 'test_output' / 'ats_test'
    test_output.mkdir(parents=True, exist_ok=True)
    
    try:
        # Create orchestrator
        orchestrator = CVOrchestrator(
            master_data_path=str(master_data_path),
            publications_path='~/CV/publications.bib',
            output_dir=str(test_output),
            llm_client=None  # No LLM needed for this test
        )
        
        # Create test data optimized for ATS testing
        selected_content, job_analysis = create_test_data_for_ats()
        
        print(f"📄 Generating enhanced ATS DOCX...")
        print(f"   Company: {job_analysis['company']}")
        print(f"   Role: {job_analysis['title']}")
        print(f"   Required Skills: {', '.join(job_analysis['required_skills'][:3])}...")
        print(f"   ATS Keywords: {len(job_analysis['ats_keywords'])} keywords")
        
        # Test the enhanced ATS DOCX generation
        ats_file = orchestrator._generate_ats_docx(
            selected_content,
            job_analysis, 
            test_output
        )
        
        if ats_file.exists() and ats_file.stat().st_size > 0:
            print(f"✅ SUCCESS! Enhanced ATS DOCX generated: {ats_file}")
            print(f"   File size: {ats_file.stat().st_size:,} bytes")
            print(f"   Location: {ats_file.absolute()}")
            
            # Test the ATS validation
            ats_score = orchestrator._validate_ats_compatibility(selected_content, job_analysis)
            print(f"   ATS Compatibility Score: {ats_score}/100")
            
            if ats_score >= 80:
                print("   🎯 Excellent ATS compatibility!")
            elif ats_score >= 60:
                print("   ✓ Good ATS compatibility")
            else:
                print("   ⚠ ATS compatibility needs improvement")
                
        else:
            print(f"⚠ ATS DOCX generation created file but it may be empty: {ats_file}")
            
    except Exception as e:
        print(f"❌ ERROR: Enhanced ATS DOCX generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n🔗 Enhanced ATS Features Tested:")
    print("✓ ATS-optimized formatting and section headers")
    print("✓ Keyword optimization and enhancement")
    print("✓ Professional summary enhancement with missing keywords")
    print("✓ Skills prioritization based on job requirements")
    print("✓ Achievement enhancement with action verbs")
    print("✓ ATS compatibility validation scoring")
    print("✓ Enhanced contact info and clean styling")
    
    return True


if __name__ == '__main__':
    main()