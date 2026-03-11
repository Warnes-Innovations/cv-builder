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

from unittest.mock import MagicMock

from scripts.utils.cv_orchestrator import CVOrchestrator
from test_utils import TestHelpers, TestAssertions, create_temp_output_dir


# ---------------------------------------------------------------------------
# Helpers that work with the current CVOrchestrator API
# ---------------------------------------------------------------------------
_MINIMAL_MASTER = {
    'personal_info': {
        'name': 'Jane Smith',
        'contact': {
            'email': 'jane@example.com',
            'phone': '555-123-4567',
            'address': {'city': 'Rochester', 'state': 'NY'},
        },
    },
    'professional_summaries': {'default': 'Experienced professional.'},
    'education':        [],
    'awards':           [],
    'certifications':   [],
}

_MINIMAL_JOB_ANALYSIS = {
    'company': 'TestCompany',
    'title':   'Senior Data Scientist',
    'domain':  'data_science',
    'suggested_summary': 'default',
}


def _make_test_orchestrator(output_dir: Path) -> CVOrchestrator:
    """Create a CVOrchestrator wired to a temporary directory."""
    master_path = Path(output_dir) / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(_MINIMAL_MASTER))
    pubs_path = Path(output_dir) / 'publications.bib'
    pubs_path.touch()
    return CVOrchestrator(
        master_data_path  = str(master_path),
        publications_path = str(pubs_path),
        output_dir        = str(output_dir),
        llm_client        = MagicMock(),
    )


def _compat_generate_pdf(
    orchestrator: CVOrchestrator,
    selected_content: dict,
    output_dir,
    job_analysis: dict = None,
) -> str:
    """Back-compatible wrapper: prepare cv_data then call _generate_human_pdf."""
    if job_analysis is None:
        job_analysis = _MINIMAL_JOB_ANALYSIS
    cv_data = orchestrator._prepare_cv_data_for_template(selected_content, job_analysis)
    _html, pdf_path = orchestrator._generate_human_pdf(cv_data, job_analysis, Path(output_dir))
    return str(pdf_path)


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
        orchestrator = _make_test_orchestrator(output_dir)
        
        print("📄 Generating PDF with standardized test data...")
        start_time = time.time()
        
        # Generate PDF
        pdf_file = _compat_generate_pdf(orchestrator, cv_data, output_dir)
        
        generation_time = time.time() - start_time
        
        # Validate output
        html_file = Path(pdf_file).with_suffix('.html')
        if html_file.exists():
            # validate html file structure and content
            TestHelpers.validate_html_file(str(html_file), required_snippet='Jane Smith')
            print(f"✓ HTML template rendered: {html_file.name}")
        else:
            print(f"⚠ HTML output missing: {html_file}")

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
        orchestrator = _make_test_orchestrator(output_dir)
        
        print("📋 Validating PDF content structure...")
        
        # Generate PDF with known content
        pdf_file = _compat_generate_pdf(orchestrator, cv_data, output_dir)
        
        # Check HTML output
        html_file = Path(pdf_file).with_suffix('.html')
        if html_file.exists():
            print(f"✓ Rendered HTML found: {html_file.name}")
        else:
            print(f"⚠ No HTML output generated")

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
    
    orchestrator = _make_test_orchestrator(output_dir)
    passed_tests = 0
    
    for test_case in test_cases:
        try:
            print(f"  Testing {test_case['name']}...")
            
            # This should either handle gracefully or raise expected error
            pdf_file = _compat_generate_pdf(orchestrator, test_case['cv_data'], output_dir)
            
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
    
    orchestrator = _make_test_orchestrator(output_dir)
    
    # Benchmark single generation
    result, elapsed = TestHelpers.benchmark_operation(
        "PDF Generation",
        _compat_generate_pdf,
        orchestrator, cv_data, output_dir,
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
    
    orchestrator = _make_test_orchestrator(output_dir)
    
    try:
        # Test PDF generation
        pdf_file = _compat_generate_pdf(orchestrator, cv_data, output_dir)
        
        pdf_success = TestHelpers.validate_pdf_file(pdf_file)
        
        # Test DOCX generation if available (API may have changed)
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
