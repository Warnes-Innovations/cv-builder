#!/usr/bin/env python3
"""
CV Builder Testing Framework - Main Test Runner

Comprehensive testing suite that runs all test categories:
- Unit tests (individual components)
- Integration tests (API endpoints)
- End-to-end tests (complete workflows)
- Performance tests (PDF/DOCX generation)
"""

import sys
import os
import time
import subprocess
from pathlib import Path
from typing import List, Dict, Optional
import argparse
import json

# Add scripts to Python path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))


class TestRunner:
    """Orchestrates all CV Builder tests with proper setup and teardown."""
    
    def __init__(self, verbose: bool = False, llm_provider: Optional[str] = None, llm_model: Optional[str] = None):
        self.verbose = verbose
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.results = {}
        self.start_time = time.time()
        self.server_pid: Optional[int] = None
        
    def ensure_conda_env(self):
        """Ensure we're in the correct conda environment."""
        current_env = os.environ.get('CONDA_DEFAULT_ENV', '')
        if current_env != 'cvgen':
            print("⚠️  Warning: Not in 'cvgen' conda environment")
            print("   Please run: conda activate cvgen")
            return False
        return True
    
    def start_web_server(self, port=5001) -> bool:
        """Start the Flask web server for integration tests."""
        try:
            print(f"🚀 Starting web server on port {port}...")
            
            # Check if port is already in use
            result = subprocess.run(['lsof', '-i', f':{port}'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Server already running on port {port}")
                return True
            
            # Start server in background
            cmd = [sys.executable, 'scripts/web_app.py']
            if self.llm_provider:
                cmd += ['--llm-provider', self.llm_provider]
            if self.llm_model:
                cmd += ['--llm-model', self.llm_model]
            server_process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            
            # Give server time to start
            time.sleep(3)
            
            # Check if server started successfully  
            result = subprocess.run(['lsof', '-i', f':{port}'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Web server started successfully (PID: {server_process.pid})")
                self.server_pid = server_process.pid
                return True
            else:
                print("❌ Failed to start web server")
                return False
                
        except Exception as e:
            print(f"❌ Error starting server: {e}")
            return False
    
    def stop_web_server(self):
        """Stop the web server if we started it."""
        if self.server_pid:
            try:
                subprocess.run(['kill', str(self.server_pid)], check=False)
                print(f"🛑 Stopped web server (PID: {self.server_pid})")
                time.sleep(1)  # Give it time to shut down
            except Exception as e:
                print(f"⚠️  Error stopping server: {e}")
    
    def run_unit_tests(self) -> Dict[str, bool]:
        """Run unit tests (components that don't need web server)."""
        print("\n🧪 Running Unit Tests")
        print("=" * 50)
        
        unit_tests = [
            'tests/test_copilot_auth.py',
            'tests/test_url_fetch.py',
            'tests/test_scoring.py',
            'tests/test_template_renderer.py',
            'tests/test_cv_orchestrator.py',
        ]
        
        results = {}
        for test_file in unit_tests:
            if Path(test_file).exists():
                success = self._run_test_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False
        
        return results
    
    def run_component_tests(self) -> Dict[str, bool]:
        """Run component tests (PDF generation, ATS, etc.)."""
        print("\n📄 Running Component Tests")
        print("=" * 50)
        
        component_tests = [
            'tests/test_ats_generation.py',
        ]
        
        results = {}
        for test_file in component_tests:
            if Path(test_file).exists():
                success = self._run_test_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False
        
        return results
    
    def run_integration_tests(self) -> Dict[str, bool]:
        """Run integration tests (require web server)."""
        print("\n🌐 Running Integration Tests")  
        print("=" * 50)
        
        integration_tests = [
            'tests/test_enhanced_job_input.py',
            'tests/test_linkedin_url_handling.py',
            'tests/test_user_linkedin_url.py',
            'tests/test_web_ui_workflow.py',
        ]
        
        results = {}
        for test_file in integration_tests:
            if Path(test_file).exists():
                success = self._run_test_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False
        
        return results
    
    def run_ui_tests(self) -> Dict[str, bool]:
        """Run Playwright UI tests (browser automation)."""
        print("\n🎭 Running UI Tests (Playwright)")
        print("=" * 50)

        ui_test_dir = Path('tests/ui')
        if not ui_test_dir.exists():
            print("⚠️  tests/ui/ directory not found")
            return {}

        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pytest', 'tests/ui/', '-v', '--tb=short'],
                capture_output=not self.verbose,
                text=True,
                timeout=300,
            )
            success = result.returncode == 0
            if success:
                print("✅ UI tests passed")
            else:
                print("❌ UI tests failed")
                if not self.verbose and result.stdout:
                    print(result.stdout[-3000:])  # last 3k chars
                if not self.verbose and result.stderr:
                    print(result.stderr[-1000:])
            return {'tests/ui/': success}
        except subprocess.TimeoutExpired:
            print("⏰ UI tests timed out")
            return {'tests/ui/': False}
        except Exception as e:
            print(f"💥 UI tests crashed: {e}")
            return {'tests/ui/': False}

    def _run_test_file(self, test_file: str) -> bool:
        """Run a specific test file and return success status."""
        print(f"\n🔍 Running {test_file}...")
        
        try:
            result = subprocess.run([sys.executable, test_file], 
                                  capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                print(f"✅ {test_file} passed")
                if self.verbose:
                    print("STDOUT:", result.stdout)
                return True
            else:
                print(f"❌ {test_file} failed")
                print("STDERR:", result.stderr)
                if result.stdout:
                    print("STDOUT:", result.stdout)
                return False
                
        except subprocess.TimeoutExpired:
            print(f"⏰ {test_file} timed out")
            return False
        except Exception as e:
            print(f"💥 {test_file} crashed: {e}")
            return False
    
    def run_all_tests(self, categories: List[str] = None):
        """Run all test categories."""
        if not self.ensure_conda_env():
            print("❌ Please activate the 'cvgen' conda environment first")
            return False
        
        print("🧪 CV Builder Test Suite")
        print("=" * 60)
        print(f"Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Default to all categories if none specified
        if not categories:
            categories = ['unit', 'component', 'integration', 'ui']
        
        # Run unit tests (no server needed)
        if 'unit' in categories:
            self.results['unit'] = self.run_unit_tests()
        
        # Run component tests (no server needed)  
        if 'component' in categories:
            self.results['component'] = self.run_component_tests()
        
        # Run integration tests (need web server)
        if 'integration' in categories:
            server_started = self.start_web_server()
            if server_started:
                self.results['integration'] = self.run_integration_tests()
                self.stop_web_server()
            else:
                print("❌ Skipping integration tests - could not start web server")
                self.results['integration'] = {}

        # Run UI (Playwright) tests — server is managed internally by conftest.py
        if 'ui' in categories:
            self.results['ui'] = self.run_ui_tests()

        self.print_summary()
        return self._overall_success()
    
    def print_summary(self):
        """Print test results summary."""
        print("\n📊 Test Results Summary")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        
        for category, tests in self.results.items():
            print(f"\n{category.upper()} TESTS:")
            for test_name, success in tests.items():
                status = "✅ PASS" if success else "❌ FAIL"
                print(f"  {test_name}: {status}")
                total_tests += 1
                if success:
                    passed_tests += 1
        
        elapsed = time.time() - self.start_time
        print(f"\n⏱️  Total time: {elapsed:.2f}s")
        print(f"📈 Results: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {total_tests - passed_tests} test(s) failed")
    
    def _overall_success(self) -> bool:
        """Return True if all tests passed."""
        for category, tests in self.results.items():
            for test_name, success in tests.items():
                if not success:
                    return False
        return True


def main():
    """Main entry point with command-line argument parsing."""
    parser = argparse.ArgumentParser(description='CV Builder Test Runner')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    parser.add_argument('--categories', '-c', nargs='+',
                       choices=['unit', 'component', 'integration', 'ui'],
                       help='Test categories to run (default: all)')
    parser.add_argument('--list', '-l', action='store_true',
                       help='List available test files')
    parser.add_argument('--llm-provider',
                       choices=['copilot-oauth', 'copilot', 'github', 'openai', 'anthropic', 'gemini', 'groq', 'local', 'copilot-sdk'],
                       help='LLM provider for the test server (default: from config.yaml)')
    parser.add_argument('--llm-model',
                       help='LLM model override for the test server')
    
    args = parser.parse_args()
    
    if args.list:
        print("Available test files:")
        for test_file in sorted(Path('tests').glob('test_*.py')):
            print(f"  {test_file}")
        return
    
    runner = TestRunner(
        verbose=args.verbose,
        llm_provider=args.llm_provider,
        llm_model=args.llm_model,
    )
    success = runner.run_all_tests(args.categories)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()