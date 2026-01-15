#!/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python
"""
LLM-Driven CV Generation System

This is the main entry point for the LLM-driven CV generation system.
It uses an LLM (via API or local model) for semantic understanding and
conversational interaction, while leveraging Python utilities for
document generation.

Usage:
    # Interactive mode (default)
    python llm_cv_generator.py
    
    # With job description file
    python llm_cv_generator.py --job-file job.txt
    
    # Specify LLM provider
    python llm_cv_generator.py --llm-provider openai
    python llm_cv_generator.py --llm-provider anthropic
    python llm_cv_generator.py --llm-provider local
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import get_config
from utils.llm_client import LLMClient, get_llm_provider
from utils.cv_orchestrator import CVOrchestrator
from utils.conversation_manager import ConversationManager
from utils.conversation_manager import ConversationManager


def clear_console():
    """Clear the console screen."""
    os.system('clear' if os.name != 'nt' else 'cls')


def main():
    """Main entry point for LLM-driven CV generation."""
    # Load configuration
    config = get_config()
    
    parser = argparse.ArgumentParser(
        description='LLM-Driven CV Generation System - Interactive CV customization',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start interactive session
  python llm_cv_generator.py
  
  # Load job description and start
  python llm_cv_generator.py --job-file sample_jobs/data_science_lead.txt
  
  # Use specific LLM provider
  python llm_cv_generator.py --llm-provider anthropic
  
  # Use local model (no API key needed)
  python llm_cv_generator.py --llm-provider local
        """
    )
    
    parser.add_argument(
        '--job-file',
        help='Path to job description text file (optional - can paste in conversation)'
    )
    parser.add_argument(
        '--master-data',
        default=config.master_cv_path,
        help='Path to Master_CV_Data.json'
    )
    parser.add_argument(
        '--publications',
        default=config.publications_path,
        help='Path to publications.bib'
    )
    parser.add_argument(
        '--output-dir',
        default=config.output_dir,
        help='Output directory for generated files'
    )
    parser.add_argument(
        '--llm-provider',
        choices=['github', 'openai', 'anthropic', 'local'],
        default=config.llm_provider,
        help='LLM provider to use'
    )
    parser.add_argument(
        '--model',
        help='Specific model to use (e.g., gpt-4, claude-3-opus, etc.)'
    )
    parser.add_argument(
        '--non-interactive',
        action='store_true',
        help='Run in non-interactive mode (for testing/automation)'
    )
    parser.add_argument(
        '--resume-session',
        help='Resume a previous session from conversation history file'
    )
    
    args = parser.parse_args()
    
    # Args already have config defaults, just use them directly
    master_data  = args.master_data
    publications = args.publications
    output_dir   = args.output_dir
    llm_provider = args.llm_provider
    llm_model    = args.model or config.llm_model
    
    # Clear console only in interactive mode
    if not args.non_interactive:
        clear_console()
    
    # Print banner
    print("\n" + "="*70)
    print("   LLM-Driven CV Generation System")
    print("   Conversational AI-powered CV customization")
    print("="*70 + "\n")
    
    try:
        # Initialize LLM client
        print(f"Initializing LLM ({llm_provider})...")
        llm_client = get_llm_provider(
            provider=llm_provider,
            model=llm_model
        )
        print("✓ LLM initialized\n")
        
        # Initialize orchestrator
        orchestrator = CVOrchestrator(
            master_data_path=master_data,
            publications_path=publications,
            output_dir=output_dir,
            llm_client=llm_client
        )
        
        # Initialize conversation manager
        conversation = ConversationManager(
            orchestrator=orchestrator,
            llm_client=llm_client
        )
        
        # Resume or start new session
        if args.resume_session:
            conversation.load_session(args.resume_session)
            print(f"Resumed session from: {args.resume_session}\n")
        
        # Load job description if provided
        if args.job_file:
            job_file_path = Path(args.job_file)
            if job_file_path.exists():
                job_text = job_file_path.read_text(encoding='utf-8')
                conversation.add_job_description(job_text)
                print(f"✓ Loaded job description from: {args.job_file}\n")
            else:
                print(f"⚠ Warning: Job file not found: {args.job_file}\n")
        
        # Start interactive conversation
        if args.non_interactive:
            print("Non-interactive mode: Running automated generation...")
            result = conversation.run_automated()
            print(f"\n✓ Generation complete: {result['output_dir']}")
        else:
            print("Starting interactive conversation...")
            print("(Type 'help' for commands, 'quit' to exit, 'QUIT' for confirm)\n")
            conversation.start_interactive()
    
    except KeyboardInterrupt:
        print("\n\nSession interrupted by user.")
        print("Your progress has been saved.")
        return 0
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
