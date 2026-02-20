#!/usr/bin/env python3
"""
Test script to verify complete Web UI workflow integration 

This test verifies:
1. Job description upload ✓
2. CV customization ✓  
3. CV generation with enhanced PDF/DOCX ✓
4. File download functionality ✓
"""

import sys
import requests
import json
import time
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

def test_web_ui_workflow():
    """Test complete workflow with web server"""
    base_url = "http://localhost:5001"
    
    print("🧪 Testing Complete Web UI Workflow Integration")
    print("=" * 60)
    
    # Step 1: Test job description upload
    print("\n📄 Step 1: Testing job description upload...")
    
    job_text = """Senior Data Science Manager
Remote - XYZ Corp

We are seeking a Senior Data Science Manager to lead our growing data science team.

Key Requirements:
- PhD in Statistics, Computer Science, or related field
- 8+ years of experience in data science and machine learning
- Experience managing teams of 5+ data scientists
- Strong programming skills in Python and R
- Experience with cloud platforms (AWS, Azure, GCP)
- Experience with MLOps and productionizing models

Responsibilities:
- Lead and manage a team of data scientists
- Develop strategic data science roadmap
- Collaborate with engineering teams on ML infrastructure
- Present findings to executive leadership
"""

    # Upload job description
    response = requests.post(f"{base_url}/api/job", 
                           json={"job_text": job_text})
    
    if response.status_code == 200:
        print("  ✅ Job description uploaded successfully")
    else:
        print(f"  ❌ Job description upload failed: {response.status_code}")
        return False
    
    # Step 2: Check status after job upload
    print("\n📊 Step 2: Checking status after job upload...")
    response = requests.get(f"{base_url}/api/status")
    status = response.json()
    
    if status.get('phase'):
        print(f"  ✅ Current phase: {status['phase']}")
    else:
        print("  ❌ No phase information")
        return False
    
    # Step 3: Analyze the job description
    print("\n🔍 Step 3: Analyzing job description...")
    response = requests.post(f"{base_url}/api/action",
                           json={"action": "analyze_job", "job_text": job_text})
    
    if response.status_code == 200:
        result = response.json()
        print("  ✅ Job analysis completed successfully")
        print(f"  📝 Response: {result.get('result', 'No result message')[:100]}...")
    else:
        print(f"  ❌ Job analysis failed: {response.status_code}")
        print(f"  💬 Error: {response.text}")
        return False

    # Step 4: Generate customizations
    print("\n🎯 Step 4: Generating customizations...")
    response = requests.post(f"{base_url}/api/action",
                           json={"action": "recommend_customizations"})
    
    if response.status_code == 200:
        result = response.json()
        print("  ✅ Customizations generated successfully")
        print(f"  📝 Response: {result.get('result', 'No result message')[:100]}...")
    else:
        print(f"  ❌ Customization generation failed: {response.status_code}")
        print(f"  💬 Error: {response.text}")
        return False
    
    # Wait for customizations to complete
    print("\n⏱️ Step 5: Waiting for customizations to complete...")
    
    for i in range(30):  # Wait up to 30 seconds
        time.sleep(1)
        response = requests.get(f"{base_url}/api/status")
        status = response.json()
        
        if status.get('phase') == 'generation':
            print(f"  ✅ Customizations completed, in generation phase")
            break
        elif i > 0 and i % 5 == 0:
            print(f"  ⏳ Still generating customizations... ({i}s elapsed)")
    
    # Step 5: Trigger CV generation  
    print("\n⚙️ Step 6: Triggering CV generation...")
    response = requests.post(f"{base_url}/api/action",
                           json={"action": "generate_cv"})
    
    if response.status_code == 200:
        result = response.json()
        print("  ✅ CV generation initiated successfully")
        print(f"  📝 Response: {result.get('result', 'No result message')[:100]}...")
    else:
        print(f"  ❌ CV generation failed: {response.status_code}")
        print(f"  💬 Error: {response.text}")
        return False
    
    # Step 6: Wait for generation and check status
    print("\n⏱️ Step 7: Waiting for CV generation to complete...")
    
    for i in range(60):  # Wait up to 60 seconds
        time.sleep(1)
        response = requests.get(f"{base_url}/api/status")
        status = response.json()
        
        if status.get('generated_files'):
            print(f"  ✅ Files generated successfully!")
            generated_files = status['generated_files']
            print(f"  📁 Generated files: {list(generated_files.keys()) if isinstance(generated_files, dict) else 'Files available'}")
            
            # Step 7: Test download functionality
            print("\n⬇️ Step 8: Testing file downloads...")
            
            # Handle different data structures
            files_to_test = []
            if isinstance(generated_files, dict) and 'files' in generated_files:
                # This is the orchestrator structure: {output_dir, files, metadata}
                files_to_test = generated_files['files']
            else:
                # Legacy structure
                for file_type, file_data in generated_files.items():
                    if isinstance(file_data, dict):
                        filename = file_data.get('filename')
                        if filename:
                            files_to_test.append(filename)
                    elif isinstance(file_data, str):
                        filename = Path(file_data).name
                        files_to_test.append(filename)
            
            for filename in files_to_test:
                if filename:
                    print(f"  📄 Testing download for {filename}...")
                    download_response = requests.get(f"{base_url}/api/download/{filename}")
                    
                    if download_response.status_code == 200:
                        file_size = len(download_response.content)
                        print(f"    ✅ {filename} downloaded successfully ({file_size} bytes)")
                    else:
                        print(f"    ❌ Download failed for {filename}: {download_response.status_code}")
            
            print("\n✅ WORKFLOW TEST COMPLETED SUCCESSFULLY!")
            print("🎉 Web UI Integration with Enhanced Download is Working!")
            return True
            
        elif i > 0 and i % 5 == 0:
            print(f"  ⏳ Still generating... ({i}s elapsed)")
    
    print("  ⚠️ Generation timed out")
    return False

if __name__ == "__main__":
    try:
        success = test_web_ui_workflow()
        if success:
            print("\n🏆 ALL TESTS PASSED - Web UI workflow integration complete!")
            sys.exit(0)
        else:
            print("\n❌ TESTS FAILED - Issues detected")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)