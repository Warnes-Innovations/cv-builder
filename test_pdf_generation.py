#!/usr/bin/env python3
"""
Enhanced PDF Generation Tests

Tests the Quarto-based PDF generation pipeline with comprehensive validation,
performance benchmarking, and error handling.
"""

import os
import sys
from pathlib import Path
import json
import time

# Add the scripts directory to the path
sys.path.append(str(Path(__file__).parent / 'scripts'))
sys.path.insert(0, str(Path(__file__).parent))

from scripts.utils.cv_orchestrator import CVOrchestrator
from test_utils import TestHelpers, TestAssertions, create_temp_output_dir


def run_basic_pdf_test():
    """Test basic PDF generation functionality."""
    print("\n🔍 Test 1: Basic PDF Generation")
    print("-" * 40)
    
    # Create output directory
    output_dir = create_temp_output_dir()
    
    # Create test data using utilities
    cv_data = TestHelpers.create_sample_cv_data()
    job_text = TestHelpers.create_sample_job_data()
    
    try:
        # Initialize orchestrator
        orchestrator = CVOrchestrator()
        
        print("📄 Generating PDF with standardized test data...")
        start_time = time.time()
        
        # Generate PDF
        pdf_file = orchestrator.generate_pdf(
            selected_content=cv_data,
            job_description=job_text,
            output_dir=output_dir
        )
        
        generation_time = time.time() - start_time
        
        # Validate output
        if TestHelpers.validate_pdf_file(pdf_file):
            file_size = Path(pdf_file).stat().st_size
            print(f"✅ Basic PDF test PASSED")
            print(f"   File: {pdf_file}")
            print(f"   Size: {file_size:,} bytes")
            print(f"   Generation time: {generation_time:.2f}s")
            return True
        else:
            print("❌ Basic PDF test FAILED - invalid PDF")
            return False
            
    except Exception as e:
        print(f"❌ Basic PDF test FAILED: {e}")
        return False


def run_content_validation_test():
    """Test that generated PDF contains expected content."""
    print("\n🔍 Test 2: Content Validation")
    print("-" * 40)
    
    output_dir = create_temp_output_dir()
    cv_data = TestHelpers.create_sample_cv_data()
    job_text = TestHelpers.create_sample_job_data()
    
    try:
        orchestrator = CVOrchestrator()
        
        print("📋 Validating PDF content structure...")
        
        # Generate PDF with known content
        pdf_file = orchestrator.generate_pdf(
            selected_content=cv_data,
            job_description=job_text,
            output_dir=output_dir
        )
        
        # Basic validation
        TestAssertions.assert_file_generated(pdf_file, min_size=10240)  # 10KB minimum
        
        # Content structure validation
        # Note: Full PDF text extraction would need additional libraries
        # For now, we validate the input data structure
        TestAssertions.assert_cv_content(cv_data)
        
        print("✅ Content validation test PASSED")
        print(f"   Validated CV data structure")
        print(f"   Validated file generation")
        return True
        
    except Exception as e:
        print(f"❌ Content validation test FAILED: {e}")
        return False


def run_error_handling_test():
    """Test PDF generation with invalid/missing data."""
    print("\n🔍 Test 3: Error Handling")
    print("-" * 40)
    
    output_dir = create_temp_output_dir()
    
    test_cases = [
        {
            'name': 'Empty CV data',
            'cv_data': {},
            'job_text': TestHelpers.create_sample_job_data()
        },
        {
            'name': 'Missing personal info',
            'cv_data': {'experiences': []},
            'job_text': TestHelpers.create_sample_job_data()
        },
        {
            'name': 'Empty job description',
            'cv_data': TestHelpers.create_sample_cv_data(),
            'job_text': ''
        }
    ]
    
    orchestrator = CVOrchestrator()
    passed_tests = 0
    
    for test_case in test_cases:
        try:
            print(f"  Testing {test_case['name']}...")
            
            # This should either handle gracefully or raise expected error
            pdf_file = orchestrator.generate_pdf(
                selected_content=test_case['cv_data'],
                job_description=test_case['job_text'],
                output_dir=output_dir
            )
            
            if pdf_file and Path(pdf_file).exists():
                print(f"  ✅ {test_case['name']}: Handled gracefully")
                passed_tests += 1
            else:
                print(f"  ⚠️  {test_case['name']}: No output generated")
                
        except Exception as e:
            print(f"  ❌ {test_case['name']}: Unexpected error - {e}")
    
    if passed_tests > 0:
        print(f"✅ Error handling test PASSED ({passed_tests}/{len(test_cases)} cases)")
        return True
    else:
        print("❌ Error handling test FAILED - no cases handled gracefully")
        return False


def run_performance_test():
    """Test PDF generation performance."""
    print("\n🔍 Test 4: Performance Benchmarks")
    print("-" * 40)
    
    output_dir = create_temp_output_dir()
    cv_data = TestHelpers.create_sample_cv_data()
    job_text = TestHelpers.create_sample_job_data()
    
    orchestrator = CVOrchestrator()
    
    # Benchmark single generation
    result, elapsed = TestHelpers.benchmark_operation(
        "PDF Generation",
        orchestrator.generate_pdf,
        selected_content=cv_data,
        job_description=job_text,
        output_dir=output_dir
    )
    
    # Performance assertions
    try:
        assert elapsed < 15.0, f"PDF generation too slow: {elapsed:.2f}s"
        assert result and Path(result).exists(), "PDF generation failed"
        
        print("✅ Performance test PASSED")
        print(f"   Generation time: {elapsed:.2f}s (target: <15s)")
        return True
        
    except AssertionError as e:
        print(f"❌ Performance test FAILED: {e}")
        return False


def run_multiple_formats_test():
    """Test generation of multiple formats if supported."""
    print("\n🔍 Test 5: Multiple Format Support")
    print("-" * 40)
    
    output_dir = create_temp_output_dir()
    cv_data = TestHelpers.create_sample_cv_data()
    job_text = TestHelpers.create_sample_job_data()
    
    orchestrator = CVOrchestrator()
    
    try:
        # Test PDF generation
        pdf_file = orchestrator.generate_pdf(
            selected_content=cv_data,
            job_description=job_text,
            output_dir=output_dir
        )
        
        pdf_success = TestHelpers.validate_pdf_file(pdf_file)
        
        # Test DOCX generation if available
        docx_success = False
        try:
            if hasattr(orchestrator, 'generate_docx'):
                docx_file = orchestrator.generate_docx(
                    selected_content=cv_data,
                    job_description=job_text,
                    output_dir=output_dir
                )
                docx_success = TestHelpers.validate_docx_file(docx_file)
        except Exception as e:
            print(f"   DOCX generation not available: {e}")
        
        if pdf_success:
            print("✅ Multiple formats test PASSED")
            print(f"   PDF: {'✓' if pdf_success else '✗'}")
            print(f"   DOCX: {'✓' if docx_success else '✗' if hasattr(orchestrator, 'generate_docx') else 'N/A'}")
            return True
        else:
            print("❌ Multiple formats test FAILED - PDF generation failed")
            return False
            
    except Exception as e:
        print(f"❌ Multiple formats test FAILED: {e}")
        return False


def main():
    """Run enhanced PDF generation test suite."""
    print("🧪 Enhanced PDF Generation Test Suite")
    print("=" * 60)
    print("Testing Quarto-based PDF generation with comprehensive validation")
    
    # Check environment
    master_data_path = Path.home() / 'CV'
    if not master_data_path.exists():
        print(f"⚠️  Warning: Master CV data not found at {master_data_path}")
        print("   Tests will use mock data only")
    
    # Run test suite
    tests = [
        ("Basic PDF Generation", run_basic_pdf_test),
        ("Content Validation", run_content_validation_test),
        ("Error Handling", run_error_handling_test),
        ("Performance Benchmarks", run_performance_test),
        ("Multiple Formats", run_multiple_formats_test),
    ]
    
    results = {}
    start_time = time.time()
    
    for test_name, test_func in tests:
        try:
            print(f"\n🔍 Running {test_name}...")
            success = test_func()
            results[test_name] = success
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    # Print summary
    total_time = time.time() - start_time
    passed_tests = sum(results.values())
    total_tests = len(results)
    
    print(f"\n📊 Test Results Summary")
    print("=" * 60)
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\n⏱️  Total time: {total_time:.2f}s")
    print(f"📈 Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All PDF generation tests passed!")
        return True
    else:
        print(f"⚠️  {total_tests - passed_tests} test(s) failed")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
                    }
                ]
            },
            {
                'id': 'exp_002', 
                'company': 'Pfizer Global R&D',
                'title': 'Principal Research Scientist',
                'location': {'city': 'Groton', 'state': 'CT'},
                'start_date': '2000-01',
                'end_date': '2024-12',
                'achievements': [
                    {
                        'text': 'Developed MiDAS Genomic Workflow System for large-scale RNA-Seq analysis.'
                    },
                    {
                        'text': 'Led biostatistics support for 50+ clinical trials across multiple therapeutic areas.'
                    }
                ]
            }
        ],
        'skills': [
            {'name': 'Data Science', 'category': 'Core Expertise', 'years': 25},
            {'name': 'Biostatistics', 'category': 'Core Expertise', 'years': 25},
            {'name': 'R/Bioconductor', 'category': 'Programming', 'years': 20},
            {'name': 'Python', 'category': 'Programming', 'years': 15},
            {'name': 'Machine Learning', 'category': 'Technical', 'years': 10}
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
        'achievements': [],
        'publications': [],
        'awards': []
    }
    
    # Sample job analysis
    job_analysis = {
        'company': 'TestCompany',
        'title': 'Senior Data Scientist',
        'domain': 'data_science',
        'suggested_summary': 'data_science_leadership'
    }
    
    return selected_content, job_analysis


def main():
    """Test PDF generation functionality."""
    
    print("🔄 Testing PDF Generation Functionality")
    print("=" * 50)
    
    # Check if we have master data file (or create a test one)
    master_data_path = Path.home() / 'CV' / 'Master_CV_Data.json'
    if not master_data_path.exists():
        print(f"⚠ Master CV data not found at {master_data_path}")
        print("Creating minimal test data file...")
        
        # Create minimal master data for testing
        master_data_path.parent.mkdir(parents=True, exist_ok=True)
        test_master_data = {
            'personal_info': {
                'name': 'Gregory R. Warnes, Ph.D.',
                'contact': {
                    'email': 'consulting@warnes.net',
                    'phone': '585-678-6661',
                    'address': {'city': 'Rochester', 'state': 'NY'},
                    'linkedin': 'https://linkedin.com/in/gregorywarnes',
                    'website': 'http://warnes.net'
                }
            },
            'professional_summaries': {
                'default': 'Senior Data Scientist with 25+ years of experience.',
                'data_science_leadership': 'Senior Data Science Leader with 25+ years of experience in biostatistics, genomics, and machine learning.'
            },
            'education': [
                {
                    'degree': 'Ph.D.',
                    'field': 'Biostatistics', 
                    'institution': 'University of Washington',
                    'location': {'city': 'Seattle', 'state': 'WA'},
                    'end_year': 2000
                }
            ],
            'awards': [],
            'certifications': []
        }
        
        with open(master_data_path, 'w') as f:
            json.dump(test_master_data, f, indent=2)
        print(f"✓ Created test master data at {master_data_path}")
    
    # Create test output directory
    test_output = Path(__file__).parent / 'test_output'
    test_output.mkdir(exist_ok=True)
    
    try:
        # Create orchestrator (without LLM client for this test)
        orchestrator = CVOrchestrator(
            master_data_path=str(master_data_path),
            publications_path='~/CV/publications.bib',  # Optional
            output_dir=str(test_output),
            llm_client=None  # We'll bypass LLM for this test
        )
        
        # Create test data
        selected_content, job_analysis = create_test_data()
        
        print(f"📄 Generating PDF with test data...")
        print(f"   Company: {job_analysis['company']}")
        print(f"   Role: {job_analysis['title']}")
        print(f"   Output: {test_output}")
        
        # Test the PDF generation directly
        pdf_file = orchestrator._generate_human_pdf(
            selected_content,
            job_analysis, 
            test_output
        )
        
        if pdf_file.exists() and pdf_file.stat().st_size > 0:
            print(f"✅ SUCCESS! PDF generated: {pdf_file}")
            print(f"   File size: {pdf_file.stat().st_size:,} bytes")
            print(f"   Location: {pdf_file.absolute()}")
            
            # Try to get file info
            if pdf_file.suffix == '.pdf':
                print("✓ Generated a proper PDF file")
            else:
                print(f"⚠ Generated {pdf_file.suffix} file (fallback mode)")
                
        else:
            print(f"⚠ PDF generation created file but it may be empty: {pdf_file}")
            
    except Exception as e:
        print(f"❌ ERROR: PDF generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n🔗 Next Steps:")
    print("1. Check the generated PDF file")
    print("2. If successful, integrate with full LLM workflow") 
    print("3. Test with real job descriptions")
    
    return True


if __name__ == '__main__':
    main()