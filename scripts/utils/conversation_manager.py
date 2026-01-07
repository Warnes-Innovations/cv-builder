"""
Conversation Manager for LLM-driven CV generation.

Handles the interactive conversation flow, state management,
and user interaction.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from .llm_client import LLMClient
from .cv_orchestrator import CVOrchestrator


class ConversationManager:
    """Manages conversational flow for CV generation."""
    
    def __init__(
        self,
        orchestrator: CVOrchestrator,
        llm_client: LLMClient
    ):
        self.orchestrator = orchestrator
        self.llm = llm_client
        self.conversation_history: List[Dict[str, str]] = []
        self.state = {
            'phase': 'init',  # init, job_analysis, customization, generation, refinement
            'job_description': None,
            'job_analysis': None,
            'customizations': None,
            'generated_files': None
        }
        self.session_dir: Optional[Path] = None
    
    def start_interactive(self):
        """Start interactive conversation loop."""
        self._print_welcome()
        
        while True:
            try:
                user_input = input("\n> ").strip()
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input.lower() in ['quit', 'exit', 'q']:
                    self._save_session()
                    print("\n✓ Session saved. Goodbye!")
                    break
                elif user_input.lower() == 'help':
                    self._print_help()
                    continue
                elif user_input.lower() == 'status':
                    self._print_status()
                    continue
                elif user_input.lower() == 'reset':
                    self._reset_conversation()
                    continue
                
                # Process with LLM
                response = self._process_message(user_input)
                print(f"\n{response}")
                
            except KeyboardInterrupt:
                print("\n\nUse 'quit' to exit safely.")
            except Exception as e:
                print(f"\n❌ Error: {e}")
                import traceback
                traceback.print_exc()
    
    def _process_message(self, user_input: str) -> str:
        """Process user message through LLM with context."""
        # Add user message to history
        self.conversation_history.append({
            'role': 'user',
            'content': user_input
        })
        
        # Build context-aware system message
        system_msg = self._build_system_prompt()
        
        # Prepare messages for LLM
        messages = [
            {'role': 'system', 'content': system_msg}
        ] + self.conversation_history
        
        # Get LLM response
        response = self.llm.chat(messages, temperature=0.7)
        
        # Add to history
        self.conversation_history.append({
            'role': 'assistant',
            'content': response
        })
        
        # Check if LLM is requesting action
        action = self._parse_action_from_response(response)
        if action:
            action_result = self._execute_action(action)
            if action_result:
                # Add action result to context
                self.conversation_history.append({
                    'role': 'system',
                    'content': f"Action completed: {action_result}"
                })
                response += f"\n\n{action_result}"
        
        return response
    
    def _build_system_prompt(self) -> str:
        """Build context-aware system prompt."""
        base_prompt = """You are an AI assistant helping to generate a customized CV.

Your role is to:
1. Analyze job descriptions and understand requirements
2. Ask clarifying questions to understand user's goals
3. Recommend customizations based on job requirements
4. Guide the user through the CV generation process
5. Help refine and iterate on generated content

You can request actions by including JSON in your response:
{"action": "analyze_job", "job_text": "..."}
{"action": "recommend_customizations"}
{"action": "generate_cv"}

Current conversation phase: {phase}
"""
        
        # Add phase-specific context
        if self.state['phase'] == 'job_analysis' and self.state['job_analysis']:
            base_prompt += f"\n\nJob Analysis Complete:\n{json.dumps(self.state['job_analysis'], indent=2)}"
        
        if self.state['customizations']:
            base_prompt += f"\n\nRecommended Customizations:\n{json.dumps(self.state['customizations'], indent=2)}"
        
        return base_prompt.format(phase=self.state['phase'])
    
    def _parse_action_from_response(self, response: str) -> Optional[Dict]:
        """Extract action request from LLM response."""
        # Look for JSON action blocks
        if '{"action":' in response:
            try:
                # Extract JSON
                start = response.find('{"action":')
                end = response.find('}', start) + 1
                action_json = response[start:end]
                return json.loads(action_json)
            except json.JSONDecodeError:
                return None
        return None
    
    def _execute_action(self, action: Dict) -> Optional[str]:
        """Execute requested action."""
        action_type = action.get('action')
        
        if action_type == 'analyze_job':
            job_text = action.get('job_text') or self.state.get('job_description')
            if not job_text:
                return "❌ No job description provided"
            
            print("\n🔄 Analyzing job description...")
            analysis = self.llm.analyze_job_description(
                job_text,
                self.orchestrator.master_data
            )
            self.state['job_analysis'] = analysis
            self.state['phase'] = 'customization'
            
            return f"✓ Job analysis complete:\n{json.dumps(analysis, indent=2)}"
        
        elif action_type == 'recommend_customizations':
            if not self.state['job_analysis']:
                return "❌ Please analyze job description first"
            
            print("\n🔄 Generating customization recommendations...")
            recommendations = self.llm.recommend_customizations(
                self.state['job_analysis'],
                self.orchestrator.master_data
            )
            self.state['customizations'] = recommendations
            self.state['phase'] = 'generation'
            
            return f"✓ Customization recommendations:\n{json.dumps(recommendations, indent=2)}"
        
        elif action_type == 'generate_cv':
            if not self.state['customizations']:
                return "❌ Please approve customizations first"
            
            print("\n🔄 Generating CV files...")
            result = self.orchestrator.generate_cv(
                self.state['job_analysis'],
                self.state['customizations']
            )
            self.state['generated_files'] = result
            self.state['phase'] = 'refinement'
            
            files_list = "\n".join(f"  - {f}" for f in result['files'])
            return f"✓ CV generated successfully!\n\nOutput directory: {result['output_dir']}\n\nFiles created:\n{files_list}"
        
        return None
    
    def add_job_description(self, job_text: str):
        """Add job description to state."""
        self.state['job_description'] = job_text
        self.state['phase'] = 'job_analysis'
    
    def _print_welcome(self):
        """Print welcome message."""
        print("\n" + "="*70)
        print("Welcome to the LLM-Driven CV Generator!")
        print("="*70)
        print("\nI'll help you create a customized CV for your target position.")
        print("\nYou can:")
        print("  • Paste a job description")
        print("  • Ask questions about your CV content")
        print("  • Review and approve customizations")
        print("  • Request regeneration with changes")
        print("\nCommands:")
        print("  • 'help' - Show available commands")
        print("  • 'status' - Check current progress")
        print("  • 'quit' - Save and exit")
        print("\n" + "-"*70)
        
        # Check if job description already loaded
        if self.state.get('job_description'):
            print("\n✓ Job description loaded. I'm ready to analyze it.")
            print("  Would you like me to start analyzing the job requirements?")
        else:
            print("\nTo get started, please paste the job description,")
            print("or tell me about the position you're targeting.")
    
    def _print_help(self):
        """Print help message."""
        print("\n" + "="*70)
        print("Available Commands:")
        print("="*70)
        print("\n  help     - Show this help message")
        print("  status   - Show current conversation state and progress")
        print("  reset    - Start over with a new CV generation")
        print("  quit     - Save session and exit")
        print("\nConversation Flow:")
        print("  1. Provide job description")
        print("  2. Review job analysis")
        print("  3. Approve customizations")
        print("  4. Generate CV files")
        print("  5. Review and refine")
        print("\n" + "-"*70)
    
    def _print_status(self):
        """Print current state."""
        print("\n" + "="*70)
        print("Current Status:")
        print("="*70)
        print(f"\nPhase: {self.state['phase']}")
        print(f"Job description: {'✓ Loaded' if self.state['job_description'] else '✗ Not provided'}")
        print(f"Job analysis: {'✓ Complete' if self.state['job_analysis'] else '✗ Pending'}")
        print(f"Customizations: {'✓ Ready' if self.state['customizations'] else '✗ Pending'}")
        print(f"Generated files: {'✓ Created' if self.state['generated_files'] else '✗ Not generated'}")
        
        if self.state['generated_files']:
            print(f"\nOutput directory: {self.state['generated_files']['output_dir']}")
        
        print("\n" + "-"*70)
    
    def _reset_conversation(self):
        """Reset conversation state."""
        confirm = input("\n⚠ This will clear all progress. Continue? (yes/no): ")
        if confirm.lower() in ['yes', 'y']:
            self.conversation_history = []
            self.state = {
                'phase': 'init',
                'job_description': None,
                'job_analysis': None,
                'customizations': None,
                'generated_files': None
            }
            print("\n✓ Conversation reset. Let's start fresh!")
        else:
            print("\n✓ Reset cancelled.")
    
    def _save_session(self):
        """Save conversation session."""
        if not self.session_dir:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.session_dir = Path(f"files/sessions/session_{timestamp}")
            self.session_dir.mkdir(parents=True, exist_ok=True)
        
        session_data = {
            'timestamp': datetime.now().isoformat(),
            'state': self.state,
            'conversation_history': self.conversation_history
        }
        
        session_file = self.session_dir / "session.json"
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2)
        
        print(f"✓ Session saved to: {session_file}")
    
    def load_session(self, session_file: str):
        """Load previous session."""
        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        self.state = session_data['state']
        self.conversation_history = session_data['conversation_history']
        self.session_dir = Path(session_file).parent
    
    def run_automated(self) -> Dict:
        """Run automated generation (non-interactive)."""
        if not self.state.get('job_description'):
            raise ValueError("Job description required for automated mode")
        
        # Analyze job
        analysis = self.llm.analyze_job_description(
            self.state['job_description'],
            self.orchestrator.master_data
        )
        self.state['job_analysis'] = analysis
        
        # Get recommendations
        recommendations = self.llm.recommend_customizations(
            analysis,
            self.orchestrator.master_data
        )
        self.state['customizations'] = recommendations
        
        # Generate
        result = self.orchestrator.generate_cv(analysis, recommendations)
        self.state['generated_files'] = result
        
        return result
