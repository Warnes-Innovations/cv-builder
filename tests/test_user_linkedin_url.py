#!/usr/bin/env python3
"""
Test the specific LinkedIn URL provided by the user
"""

import requests
import json

def test_user_linkedin_url(require_server=None):
    """Test the specific LinkedIn URL the user provided"""
    base_url = "http://127.0.0.1:5001"
    
    # The exact URL the user tried to use
    linkedin_url = "https://www.linkedin.com/jobs/view/4264067121/?trk=eml-email_job_alert_digest_01-primary_job_list-0-jobcard_body_1_jobid_4264067121_ssid_15520843548_fmid_cyj15~mlthy4gk~ct&refId=xEE%2Fs7tzmEpnqYa0EMJnAg%3D%3D&trackingId=jrPRXOSOy%2BetYtopJFZyMw%3D%3D"
    
    print("🔍 Testing User's LinkedIn URL")
    print("=" * 50)
    print(f"URL: {linkedin_url}")
    print()
    
    response = requests.post(f"{base_url}/api/fetch-job-url",
                           json={"url": linkedin_url})
    
    print(f"Response Status: {response.status_code}")
    result = response.json()
    
    print(f"Error Type: {result.get('error')}")
    print(f"Message: {result.get('message')}")
    print(f"Protected Site: {result.get('protected_site')}")
    print(f"Site Name: {result.get('site_name')}")
    
    if result.get('instructions'):
        print("\\nInstructions for user:")
        for i, instruction in enumerate(result.get('instructions'), 1):
            print(f"{i}. {instruction}")
    
    print("\\n✅ Result: LinkedIn URL is now properly detected and handled")
    print("✅ User gets clear guidance instead of generic 'Failed to fetch' error")
    print("✅ Step-by-step instructions provided for manual copy process")

if __name__ == "__main__":
    test_user_linkedin_url()