"""
Conversation Manager for LLM-driven CV generation.

Handles the interactive conversation flow, state management,
and user interaction.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import readline  # Enable line editing and history for input()

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
            'position_name': None,
            'job_description': None,
            'job_analysis': None,
            'customizations': None,
            'generated_files': None
        }
        self.session_dir: Optional[Path] = None
        # Readline history file
        self.history_file: Path = Path("files/.input_history")
    
    def _get_multiline_input(self) -> str:
        """Get multi-line input with terminators (DONE/END) and QUIT.

        DONE/END: finish multi-line entry
        QUIT: confirm, save session, and exit application
        """
        print(
            "(Enter multiple lines. Type 'DONE' or 'END' on a line by itself; "
            "type 'QUIT' to exit)"
        )
        
        lines = []
        
        while True:
            try:
                line = input()
                
                # Check for terminator keywords
                upper = line.strip().upper()
                if upper in ['DONE', 'END']:
                    break
                elif upper == 'QUIT':
                    confirm = input("\n⚠ Confirm exit? (yes/no): ")
                    if confirm.lower() in ['yes', 'y']:
                        self._save_session()
                        self._save_readline_history()
                        print("\n✓ Session saved. Goodbye!")
                        raise SystemExit(0)
                    else:
                        print("\n✓ Exit cancelled. Continue entering text.")
                        continue
                else:
                    lines.append(line)
                    
            except EOFError:
                # Ctrl+D pressed
                break
        
        return '\n'.join(lines).strip()
    
    def start_interactive(self):
        """Start interactive conversation loop."""
        self._print_welcome()
        # Ensure a position is selected or created
        self._ensure_position_selected()
        self._setup_readline()
        
        while True:
            try:
                # Check if we're expecting multi-line input (e.g., job description)
                if self.state['phase'] == 'init' and not self.state['job_description']:
                    print("\nPlease provide the job description:")
                    job_text = self._get_multiline_input()
                    if not job_text:
                        continue
                    # Store job description in state and history
                    self.add_job_description(job_text)
                    self.conversation_history.append({
                        'role': 'user',
                        'content': job_text
                    })
                    # Automatically analyze job description to set state
                    print("\n🔄 Analyzing job description...")
                    analysis = self.llm.analyze_job_description(
                        job_text,
                        self.orchestrator.master_data
                    )
                    self.state['job_analysis'] = analysis
                    self.state['phase'] = 'customization'
                    print(f"✓ Job analysis complete:\n{json.dumps(analysis, indent=2)}")
                    # Prompt assistant to ask clarifying questions
                    response = self._process_message(
                        "Please ask clarifying questions to customize my CV based on the analysis."
                    )
                    print(f"\n{response}")
                    # Continue to next loop iteration for interactive chat
                    continue
                else:
                    user_input = input("\n> ").strip()
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input == 'QUIT':
                    confirm = input("\n⚠ Confirm exit? (yes/no): ")
                    if confirm.lower() in ['yes', 'y']:
                        self._save_session()
                        self._save_readline_history()
                        print("\n✓ Session saved. Goodbye!")
                        break
                    else:
                        print("\n✓ Exit cancelled.")
                        continue
                elif user_input.lower() in ['quit', 'exit', 'q']:
                    self._save_session()
                    self._save_readline_history()
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
{{"action": "analyze_job", "job_text": "..."}}
{{"action": "recommend_customizations"}}
{{"action": "generate_cv"}}

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
        print("  • 'QUIT' - Save and exit (with confirmation)")
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
        print("  QUIT     - Save session and exit (with confirmation)")
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
            pos = self.state.get('position_name') or 'unnamed'
            self.session_dir = Path(f"files/sessions/{pos}/session_{timestamp}")
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

    def _ensure_position_selected(self):
        """Prompt user to create or open a position name."""
        while not self.state.get('position_name'):
            print("\nPosition Setup:")
            existing = self._list_positions()
            if existing:
                print("Existing positions:")
                for name in existing:
                    print(f"  • {name}")
            print("\nEnter a position name to create/open, or type 'open <name>' to load latest session, or 'list' to reprint.")
            inp = input("Position> ").strip()
            if not inp:
                continue
            if inp.lower() == 'list':
                # loop will reprint
                continue
            if inp.lower().startswith('open '):
                name = inp[5:].strip()
                if not name:
                    print("Please provide a name after 'open'.")
                    continue
                self.state['position_name'] = name
                loaded = self._load_latest_session_for_position(name)
                if loaded:
                    print(f"\n✓ Loaded latest session for position '{name}'.")
                else:
                    print(f"\n✓ Position set to '{name}'. No previous session found.")
                break
            else:
                # treat input as position name
                self.state['position_name'] = inp
                print(f"\n✓ Position set to '{inp}'.")
                break

    def _list_positions(self) -> List[str]:
        """List known position names from sessions directory."""
        root = Path("files/sessions")
        if not root.exists():
            return []
        names = []
        for child in root.iterdir():
            if child.is_dir():
                names.append(child.name)
        return sorted(names)

    def _load_latest_session_for_position(self, name: str) -> bool:
        """Load the most recent session for a given position, if any."""
        base = Path(f"files/sessions/{name}")
        if not base.exists():
            return False
        candidates = sorted(base.glob("session_*/session.json"), reverse=True)
        if not candidates:
            return False
        session_file = str(candidates[0])
        try:
            self.load_session(session_file)
            return True
        except Exception:
            return False

    def _setup_readline(self):
        """Configure readline and load input history."""
        try:
            # Ensure parent exists
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            # Load history if available
            if self.history_file.exists():
                readline.read_history_file(str(self.history_file))
            readline.set_history_length(1000)
        except Exception:
            # Silently ignore if readline is unavailable or fails
            pass

    def _save_readline_history(self):
        """Persist readline input history to file."""
        try:
            readline.write_history_file(str(self.history_file))
        except Exception:
            pass
    
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
        print("Analyzing job description...")
        analysis = self.llm.analyze_job_description(
            self.state['job_description'],
            self.orchestrator.master_data
        )
        self.state['job_analysis'] = analysis
        print("✓ Job analysis complete")
        
        # Get recommendations
        print("Getting LLM recommendations...")
        recommendations = self.llm.recommend_customizations(
            analysis,
            self.orchestrator.master_data
        )
        self.state['customizations'] = recommendations
        print("✓ Recommendations complete")
        
        # Generate
        print("Generating CV...")
        result = self.orchestrator.generate_cv(analysis, recommendations)
        self.state['generated_files'] = result
        
        return result
