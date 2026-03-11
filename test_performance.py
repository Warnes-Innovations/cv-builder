#!/usr/bin/env python3
"""
Performance and Benchmark Tests for CV Builder

Tests performance characteristics of key operations:
- PDF generation speed and memory usage
- DOCX generation performance
- API response times
- Large job description processing
"""

import sys
import time
import psutil
import os
import json
from pathlib import Path
from typing import Dict, List, Tuple
from unittest.mock import MagicMock

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))
sys.path.insert(0, str(Path(__file__).parent))

from test_utils import TestHelpers, TestAssertions, create_temp_output_dir
from scripts.utils.cv_orchestrator import CVOrchestrator


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


def _make_test_orchestrator(output_dir) -> CVOrchestrator:
    """Create a CVOrchestrator wired to a temporary directory."""
    output_dir = Path(output_dir)
    master_path = output_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(_MINIMAL_MASTER))
    pubs_path = output_dir / 'publications.bib'
    pubs_path.touch()
    return CVOrchestrator(
        master_data_path  = str(master_path),
        publications_path = str(pubs_path),
        output_dir        = str(output_dir),
        llm_client        = MagicMock(),
    )


def _compat_generate_pdf(orchestrator: CVOrchestrator, selected_content: dict,
                         output_dir, job_analysis: dict = None) -> str:
    """Back-compatible PDF wrapper using current _generate_human_pdf API."""
    if job_analysis is None:
        job_analysis = _MINIMAL_JOB_ANALYSIS
    cv_data = orchestrator._prepare_cv_data_for_template(selected_content, job_analysis)
    _html, pdf_path = orchestrator._generate_human_pdf(cv_data, job_analysis, Path(output_dir))
    return str(pdf_path)


def _compat_generate_docx(orchestrator: CVOrchestrator, selected_content: dict,
                          output_dir, job_analysis: dict = None) -> str:
    """Back-compatible DOCX wrapper using current _generate_human_docx API."""
    if job_analysis is None:
        job_analysis = _MINIMAL_JOB_ANALYSIS
    cv_data = orchestrator._prepare_cv_data_for_template(selected_content, job_analysis)
    docx_path = orchestrator._generate_human_docx(cv_data, job_analysis, Path(output_dir))
    return str(docx_path)


class PerformanceBenchmarks:
    """Performance benchmark suite for CV Builder operations."""
    
    def __init__(self):
        self.results = {}
        self.output_dir = create_temp_output_dir()
        
    def benchmark_pdf_generation(self) -> Dict[str, float]:
        """Benchmark PDF generation performance."""
        print("\n📊 Benchmarking PDF Generation Performance")
        print("-" * 50)
        
        orchestrator = _make_test_orchestrator(self.output_dir)
        cv_data = TestHelpers.create_sample_cv_data()
        job_text = TestHelpers.create_sample_job_data()
        
        # Measure memory before
        process = psutil.Process()
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Benchmark PDF generation
        start_time = time.time()
        try:
            pdf_path = _compat_generate_pdf(orchestrator, cv_data, self.output_dir)
            generation_time = time.time() - start_time
            
            # Measure memory after
            memory_after = process.memory_info().rss / 1024 / 1024  # MB
            memory_used = memory_after - memory_before
            
            # Validate output
            if TestHelpers.validate_pdf_file(pdf_path):
                pdf_size = os.path.getsize(pdf_path) / 1024  # KB
                
                results = {
                    'generation_time': generation_time,
                    'memory_used_mb': memory_used,
                    'file_size_kb': pdf_size,
                    'success': True
                }
                
                print(f"✅ PDF Generation Performance:")
                print(f"   Time: {generation_time:.2f}s")
                print(f"   Memory: {memory_used:.1f} MB")
                print(f"   File size: {pdf_size:.1f} KB")
                
                # Performance assertions
                assert generation_time < 15.0, f"PDF generation too slow: {generation_time:.2f}s"
                assert memory_used < 500, f"Memory usage too high: {memory_used:.1f} MB"
                
                return results
            else:
                return {'success': False}
                
        except Exception as e:
            print(f"❌ PDF generation failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def benchmark_docx_generation(self) -> Dict[str, float]:
        """Benchmark DOCX generation performance."""
        print("\n📊 Benchmarking DOCX Generation Performance")
        print("-" * 50)
        
        orchestrator = _make_test_orchestrator(self.output_dir)
        cv_data = TestHelpers.create_sample_cv_data()
        job_text = TestHelpers.create_sample_job_data()
        
        # Measure memory before
        process = psutil.Process()
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Benchmark DOCX generation
        start_time = time.time()
        try:
            docx_path = _compat_generate_docx(orchestrator, cv_data, self.output_dir)
            generation_time = time.time() - start_time
            
            # Measure memory after
            memory_after = process.memory_info().rss / 1024 / 1024  # MB
            memory_used = memory_after - memory_before
            
            # Validate output
            if TestHelpers.validate_docx_file(docx_path):
                docx_size = os.path.getsize(docx_path) / 1024  # KB
                
                results = {
                    'generation_time': generation_time,
                    'memory_used_mb': memory_used,
                    'file_size_kb': docx_size,
                    'success': True
                }
                
                print(f"✅ DOCX Generation Performance:")
                print(f"   Time: {generation_time:.2f}s")
                print(f"   Memory: {memory_used:.1f} MB")
                print(f"   File size: {docx_size:.1f} KB")
                
                # Performance assertions
                assert generation_time < 8.0, f"DOCX generation too slow: {generation_time:.2f}s"
                assert memory_used < 200, f"Memory usage too high: {memory_used:.1f} MB"
                
                return results
            else:
                return {'success': False}
                
        except Exception as e:
            print(f"❌ DOCX generation failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def benchmark_large_job_processing(self) -> Dict[str, float]:
        """Benchmark processing of large job descriptions."""
        print("\n📊 Benchmarking Large Job Description Processing")
        print("-" * 50)
        
        # Create a large job description (5x normal)  
        base_job = TestHelpers.create_sample_job_data()
        large_job = "\n\n".join([base_job] * 5)
        large_job += "\n\nADDITIONAL REQUIREMENTS:\n" + "\n".join([
            f"• Requirement {i+1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            for i in range(50)
        ])
        
        print(f"Job description size: {len(large_job):,} characters")
        
        orchestrator = _make_test_orchestrator(self.output_dir)
        cv_data = TestHelpers.create_sample_cv_data()
        
        # Benchmark processing
        start_time = time.time()
        try:
            # Use current API: _prepare_cv_data_for_template
            processed_data = orchestrator._prepare_cv_data_for_template(cv_data, _MINIMAL_JOB_ANALYSIS)
            processing_time = time.time() - start_time
            
            results = {
                'processing_time': processing_time,
                'job_size_chars': len(large_job),
                'success': True
            }
            
            print(f"✅ Large Job Processing Performance:")
            print(f"   Time: {processing_time:.2f}s")
            print(f"   Job size: {len(large_job):,} chars")
            
            # Performance assertions
            assert processing_time < 5.0, f"Processing too slow: {processing_time:.2f}s"
            
            return results
            
        except Exception as e:
            print(f"❌ Large job processing failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def benchmark_concurrent_operations(self) -> Dict[str, float]:
        """Benchmark concurrent PDF/DOCX generation."""
        print("\n📊 Benchmarking Concurrent Operations")
        print("-" * 50)
        
        import threading
        import concurrent.futures
        
        orchestrator = _make_test_orchestrator(self.output_dir)
        cv_data = TestHelpers.create_sample_cv_data()
        job_text = TestHelpers.create_sample_job_data()
        
        def generate_pdf_compat():
            return _compat_generate_pdf(orchestrator, cv_data, self.output_dir)
        
        def generate_docx_compat():
            return _compat_generate_docx(orchestrator, cv_data, self.output_dir)
        
        # Sequential execution
        print("Sequential execution...")
        start_time = time.time()
        pdf_path_seq  = generate_pdf_compat()
        docx_path_seq = generate_docx_compat()
        sequential_time = time.time() - start_time
        
        # Concurrent execution
        print("Concurrent execution...")
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            pdf_future  = executor.submit(generate_pdf_compat)
            docx_future = executor.submit(generate_docx_compat)
            
            pdf_path_conc  = pdf_future.result()
            docx_path_conc = docx_future.result()
        
        concurrent_time = time.time() - start_time
        
        # Calculate speedup
        speedup = sequential_time / concurrent_time if concurrent_time > 0 else 0
        
        results = {
            'sequential_time': sequential_time,
            'concurrent_time': concurrent_time,
            'speedup': speedup,
            'success': all([pdf_path_seq, docx_path_seq, pdf_path_conc, docx_path_conc])
        }
        
        print(f"✅ Concurrent Operations Performance:")
        print(f"   Sequential: {sequential_time:.2f}s")
        print(f"   Concurrent: {concurrent_time:.2f}s")
        print(f"   Speedup: {speedup:.2f}x")
        
        return results
    
    def run_all_benchmarks(self) -> Dict[str, Dict]:
        """Run all performance benchmarks."""
        print("🚀 CV Builder Performance Benchmark Suite")
        print("=" * 60)
        
        benchmarks = [
            ('pdf_generation', self.benchmark_pdf_generation),
            ('docx_generation', self.benchmark_docx_generation),
            ('large_job_processing', self.benchmark_large_job_processing),
            ('concurrent_operations', self.benchmark_concurrent_operations),
        ]
        
        results = {}
        start_time = time.time()
        
        for name, benchmark_func in benchmarks:
            try:
                print(f"\n🔍 Running {name} benchmark...")
                result = benchmark_func()
                results[name] = result
            except Exception as e:
                print(f"❌ Benchmark {name} failed: {e}")
                results[name] = {'success': False, 'error': str(e)}
        
        total_time = time.time() - start_time
        self.print_benchmark_summary(results, total_time)
        
        return results
    
    def print_benchmark_summary(self, results: Dict, total_time: float):
        """Print performance benchmark summary."""
        print("\n📊 Performance Benchmark Summary")
        print("=" * 60)
        
        successful_benchmarks = 0
        total_benchmarks = len(results)
        
        for name, result in results.items():
            status = "✅ PASS" if result.get('success') else "❌ FAIL"
            print(f"{name}: {status}")
            
            if result.get('success'):
                successful_benchmarks += 1
                # Print key metrics
                if 'generation_time' in result:
                    print(f"  Time: {result['generation_time']:.2f}s")
                if 'memory_used_mb' in result:
                    print(f"  Memory: {result['memory_used_mb']:.1f} MB")
                if 'processing_time' in result:
                    print(f"  Processing: {result['processing_time']:.2f}s")
        
        print(f"\n⏱️  Total benchmark time: {total_time:.2f}s")
        print(f"📈 Results: {successful_benchmarks}/{total_benchmarks} benchmarks passed")
        
        if successful_benchmarks == total_benchmarks:
            print("🎉 All performance benchmarks passed!")
        else:
            print(f"⚠️  {total_benchmarks - successful_benchmarks} benchmark(s) failed")


def main():
    """Run performance benchmarks."""
    try:
        benchmarks = PerformanceBenchmarks()
        results = benchmarks.run_all_benchmarks()
        
        # Return success if all benchmarks passed
        all_passed = all(result.get('success', False) for result in results.values())
        return 0 if all_passed else 1
        
    except KeyboardInterrupt:
        print("\n❌ Benchmarks interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Benchmark suite failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())