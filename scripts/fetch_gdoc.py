#!/usr/bin/env python3
"""
Fetch content from Google Docs files (.gdoc pointers) using Google Drive API.

This script reads .gdoc files (JSON pointers with doc_id) and exports the 
Google Doc content as plain text or other formats.
"""

import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle
import os

# If modifying these scopes, delete the token.pickle file.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_credentials():
    """Get valid user credentials from storage or prompt for authorization."""
    creds = None
    token_path = Path.home() / '.credentials' / 'google_drive_token.pickle'
    
    # Token file stores the user's access and refresh tokens
    if token_path.exists():
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # You'll need to create credentials.json from Google Cloud Console
            creds_file = Path.home() / '.credentials' / 'google_drive_credentials.json'
            if not creds_file.exists():
                print(f"Error: Credentials file not found at {creds_file}")
                print("Please create credentials at: https://console.cloud.google.com/apis/credentials")
                print("Download OAuth 2.0 Client ID JSON and save to the above path")
                sys.exit(1)
            
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save credentials for next run
        token_path.parent.mkdir(parents=True, exist_ok=True)
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def read_gdoc_pointer(gdoc_path):
    """Read the document ID from a .gdoc pointer file."""
    with open(gdoc_path, 'r') as f:
        data = json.load(f)
    return data.get('doc_id')

def fetch_gdoc_content(doc_id, output_format='txt'):
    """
    Fetch content from Google Docs.
    
    Args:
        doc_id: Google Doc ID
        output_format: 'txt' (plain text), 'html', 'docx', 'pdf', etc.
    
    Returns:
        Content as string (for txt/html) or bytes (for binary formats)
    """
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)
    
    # Map output format to Google Drive export MIME types
    mime_types = {
        'txt': 'text/plain',
        'html': 'text/html',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pdf': 'application/pdf',
        'md': 'text/plain',  # Will need conversion
    }
    
    mime_type = mime_types.get(output_format, 'text/plain')
    
    try:
        # Export the document
        request = service.files().export_media(fileId=doc_id, mimeType=mime_type)
        content = request.execute()
        
        # Return as string for text formats, bytes for binary
        if output_format in ['txt', 'html', 'md']:
            return content.decode('utf-8')
        return content
    
    except Exception as e:
        print(f"Error fetching document: {e}")
        sys.exit(1)

def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python fetch_gdoc.py <path-to.gdoc> [output-format]")
        print("Output formats: txt (default), html, docx, pdf")
        sys.exit(1)
    
    gdoc_path = Path(sys.argv[1])
    output_format = sys.argv[2] if len(sys.argv) > 2 else 'txt'
    
    if not gdoc_path.exists():
        print(f"Error: File not found: {gdoc_path}")
        sys.exit(1)
    
    # Read document ID from .gdoc pointer
    doc_id = read_gdoc_pointer(gdoc_path)
    if not doc_id:
        print("Error: Could not read document ID from .gdoc file")
        sys.exit(1)
    
    # Fetch content
    content = fetch_gdoc_content(doc_id, output_format)
    
    # Print to stdout (can be redirected to file)
    if isinstance(content, bytes):
        sys.stdout.buffer.write(content)
    else:
        print(content)

if __name__ == '__main__':
    main()
