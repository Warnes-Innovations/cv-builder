#!/usr/bin/env python3
"""
Test Utilities for CV Builder Testing Framework

Provides common functionality, mock data, and assertions for tests.
"""

import os
import json
import time
import requests
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
from unittest.mock import MagicMock
import subprocess


class TestHelpers:
    """Collection of helper functions for testing CV Builder components."""
    
    @staticmethod
    def create_sample_job_data() -> str:
        """Create standardized sample job description for testing."""
        return """Senior Data Scientist - Machine Learning Platform
TechCorp Innovations
Remote / San Francisco, CA

We are seeking a Senior Data Scientist to join our Machine Learning Platform team.

Key Responsibilities:
• Design and implement scalable ML pipelines using Python and cloud technologies
• Lead cross-functional collaboration with engineering and product teams  
• Mentor junior data scientists and establish best practices
• Drive adoption of MLOps practices across the organization

Required Qualifications:
• Ph.D. in Computer Science, Statistics, or related quantitative field
• 5+ years of experience building production machine learning systems
• Expert-level Python programming and experience with ML frameworks (TensorFlow, PyTorch, scikit-learn)
• Experience with cloud platforms (AWS, GCP, Azure) and containerization
• Strong communication skills and experience leading technical teams

Preferred Qualifications:
• Experience with real-time ML systems and streaming data
• Background in deep learning and neural network architectures
• Experience with A/B testing and experimental design
• Publications in top-tier ML conferences or journals

Benefits:
• Competitive salary range: $180,000 - $250,000 + equity
• Comprehensive health, dental, and vision insurance
• $5,000 annual professional development budget
• Flexible PTO and parental leave policies
• Remote work options with quarterly team gatherings"""

    @staticmethod
    def create_sample_cv_data() -> Dict[str, Any]:
        """Create standardized CV data for testing."""
        return {
            'personal_info': {
                'name': 'Dr. Jane Smith',
                'contact': {
                    'email': 'jane.smith@example.com',
                    'phone': '555-123-4567',
                    'address': {
                        'city': 'Boston',
                        'state': 'MA'
                    },
                    'linkedin': 'https://linkedin.com/in/janesmith',
                    'website': 'https://janesmith.dev'
                }
            },
            'summary': 'Senior Data Scientist with 8+ years of experience in machine learning, statistical modeling, and team leadership. Proven track record of deploying ML systems at scale.',
            'experiences': [
                {
                    'title': 'Senior Data Scientist',
                    'company': 'DataTech Solutions',
                    'location': {'city': 'Boston', 'state': 'MA'},
                    'start_date': '2020-03',
                    'end_date': 'Present',
                    'achievements': [
                        {'text': 'Led development of ML platform serving 10M+ daily predictions'},
                        {'text': 'Managed team of 6 data scientists and ML engineers'},
                        {'text': 'Implemented A/B testing framework increasing model performance by 25%'}
                    ]
                },
                {
                    'title': 'Data Scientist',
                    'company': 'Analytics Corp',
                    'location': {'city': 'Cambridge', 'state': 'MA'},
                    'start_date': '2018-06',
                    'end_date': '2020-02',
                    'achievements': [
                        {'text': 'Built predictive models using Python and TensorFlow'},
                        {'text': 'Collaborated with engineering teams on ML infrastructure'}
                    ]
                }
            ],
            'education': [
                {
                    'degree': 'Ph.D. in Computer Science',
                    'institution': 'MIT',
                    'location': {'city': 'Cambridge', 'state': 'MA'},
                    'graduation_date': '2018'
                }
            ],
            'skills': {
                'Programming': ['Python', 'R', 'SQL', 'Java'],
                'ML/AI': ['TensorFlow', 'PyTorch', 'scikit-learn', 'MLflow'],
                'Cloud': ['AWS', 'GCP', 'Docker', 'Kubernetes'],
                'Data': ['Pandas', 'NumPy', 'Apache Spark', 'PostgreSQL']
            }
        }

    @staticmethod  
    def wait_for_server(url: str, timeout: int = 30) -> bool:
        """Wait for server to become available."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code in [200, 404]:  # 404 is fine, means server is up
                    return True
            except requests.RequestException:
                pass
            time.sleep(1)
        return False

    @staticmethod
    def make_api_request(endpoint: str, data: Dict[str, Any] = None, 
                        base_url: str = "http://localhost:5001") -> requests.Response:
        """Make API request with error handling."""
        url = f"{base_url}{endpoint}"
        try:
            if data:
                return requests.post(url, json=data, timeout=30)
            else:
                return requests.get(url, timeout=30)
        except requests.RequestException as e:
            print(f"❌ API request failed: {e}")
            raise

    @staticmethod
    def validate_pdf_file(file_path: str) -> bool:
        """Validate that a PDF file was generated correctly."""
        path = Path(file_path)
        if not path.exists():
            print(f"❌ PDF file not found: {file_path}")
            return False
            
        if path.stat().st_size == 0:
            print(f"❌ PDF file is empty: {file_path}")
            return False
            
        # Basic PDF validation - check for PDF signature
        try:
            with open(file_path, 'rb') as f:
                header = f.read(8)
                if not header.startswith(b'%PDF-'):
                    print(f"❌ Invalid PDF format: {file_path}")
                    return False
        except Exception as e:
            print(f"❌ Error reading PDF: {e}")
            return False
            
        print(f"✅ PDF validation passed: {file_path}")
        return True

    @staticmethod
    def validate_docx_file(file_path: str) -> bool:
        """Validate that a DOCX file was generated correctly."""
        path = Path(file_path)
        if not path.exists():
            print(f"❌ DOCX file not found: {file_path}")
            return False
            
        if path.stat().st_size == 0:
            print(f"❌ DOCX file is empty: {file_path}")
            return False
            
        # Basic DOCX validation - it's a ZIP file
        try:
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as docx:
                # Check for required DOCX structure
                required_files = ['[Content_Types].xml', 'word/document.xml']
                for required_file in required_files:
                    if required_file not in docx.namelist():
                        print(f"❌ DOCX missing required file: {required_file}")
                        return False
        except Exception as e:
            print(f"❌ Error reading DOCX: {e}")
            return False
            
        print(f"✅ DOCX validation passed: {file_path}")
        return True

    @staticmethod
    def cleanup_test_files(pattern: str = "test_output/*"):
        """Clean up generated test files."""
        try:
            import glob
            files = glob.glob(pattern)
            for file_path in files:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print(f"🧹 Cleaned up: {file_path}")
        except Exception as e:
            print(f"⚠️  Cleanup error: {e}")

    @staticmethod
    def create_mock_auth_manager():
        """Create a mock authentication manager for testing."""
        mock_auth = MagicMock()
        mock_auth.get_github_token.return_value = "gho_test123"
        mock_auth.get_copilot_token.return_value = "tid=testcopilottoken"
        mock_auth.is_authenticated.return_value = True
        return mock_auth

    @staticmethod
    def benchmark_operation(operation_name: str, func, *args, **kwargs):
        """Benchmark an operation and return timing info."""
        print(f"⏱️  Benchmarking {operation_name}...")
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            print(f"✅ {operation_name} completed in {elapsed:.2f}s")
            return result, elapsed
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"❌ {operation_name} failed after {elapsed:.2f}s: {e}")
            raise


class TestAssertions:
    """Custom assertions for CV Builder testing."""
    
    @staticmethod
    def assert_api_response(response: requests.Response, expected_status: int = 200):
        """Assert API response meets expectations."""
        if response.status_code != expected_status:
            print(f"❌ Expected status {expected_status}, got {response.status_code}")
            print(f"Response: {response.text}")
            assert False, f"API returned {response.status_code}"
        
        # Check for JSON response
        try:
            data = response.json()
            assert isinstance(data, dict), "Response should be JSON object"
            return data
        except json.JSONDecodeError:
            assert False, "Response should be valid JSON"

    @staticmethod
    def assert_file_generated(file_path: str, min_size: int = 1024):
        """Assert that a file was generated with minimum size."""
        path = Path(file_path)
        assert path.exists(), f"File not generated: {file_path}"
        assert path.stat().st_size >= min_size, f"File too small: {file_path}"

    @staticmethod
    def assert_cv_content(cv_data: Dict[str, Any]):
        """Assert CV data has required structure."""
        required_fields = ['personal_info', 'experiences']
        for field in required_fields:
            assert field in cv_data, f"Missing required field: {field}"
        
        # Check personal info structure
        personal_info = cv_data['personal_info']
        assert 'name' in personal_info, "Missing name in personal_info"
        assert 'contact' in personal_info, "Missing contact in personal_info"


# Convenience functions for common test patterns
def run_with_server_check(test_func):
    """Decorator that ensures server is running before test."""
    def wrapper(*args, **kwargs):
        if not TestHelpers.wait_for_server("http://localhost:5001", timeout=10):
            print("❌ Web server not available - skipping test")
            return False
        return test_func(*args, **kwargs)
    return wrapper


def create_temp_output_dir() -> str:
    """Create temporary directory for test outputs."""
    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)
    return str(output_dir)


# Export commonly used functions
__all__ = [
    'TestHelpers',
    'TestAssertions', 
    'run_with_server_check',
    'create_temp_output_dir'
]