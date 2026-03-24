# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Conversation Manager for LLM-driven CV generation.

Handles the interactive conversation flow, state management,
and user interaction.
"""

import json
import logging
import re
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional
import readline  # Enable line editing and history for input()

from .llm_client import LLMClient, LLMError, LLMAuthError, LLMRateLimitError, LLMContextLengthError
from .cv_orchestrator import CVOrchestrator
from .config import get_config
from .session_data_view import SessionDataView


logger = logging.getLogger(__name__)


# SOURCE OF TRUTH for workflow phase names.
# The JS mirror is PHASES in web/state-manager.js — update both files together.
class Phase(str, Enum):
    INIT          = 'init'
    JOB_ANALYSIS  = 'job_analysis'
    CUSTOMIZATION = 'customization'
    REWRITE_REVIEW = 'rewrite_review'
    SPELL_CHECK   = 'spell_check'
    GENERATION    = 'generation'
    LAYOUT_REVIEW = 'layout_review'
    REFINEMENT    = 'refinement'


class ConversationManager:
    """Manages conversational flow for CV generation."""
    
    def __init__(
        self,
        orchestrator: CVOrchestrator,
        llm_client: LLMClient,
        config=None
    ):
        self.orchestrator = orchestrator
        self.llm = llm_client
        self.config = config or get_config()
        self.conversation_history: List[Dict[str, str]] = []
        self.state = {
            'phase':              Phase.INIT,
            'position_name':      None,
            'job_description':    None,
            'job_analysis':       None,
            'post_analysis_questions': [],
            'post_analysis_answers':   {},
            'customizations':     None,
            'generated_files':    None,
            'pending_rewrites':   None,   # List[Dict] from propose_rewrites
            'persuasion_warnings': [],    # List[Dict] from run_persuasion_checks (Phase 10)
            'generation_progress': [],    # List[Dict] step-by-step progress from generate_cv (Phase 10)
            'approved_rewrites':  [],     # List[Dict] user-accepted or user-edited
            'rewrite_audit':      [],     # full record: proposal + outcome for metadata
            'layout_instructions': [],    # List[Dict] layout instruction history (Phase 12)
            'cover_letter_text':   None,   # str — finalized cover letter body (Phase 14)
            'cover_letter_params': None,   # Dict — generation params (tone, hiring_manager, …)
            'cover_letter_reused_from': None,  # str session path or None
            'screening_responses': [],    # List[Dict] — saved screening responses (Phase 15)
            'experience_decisions':   {},   # Dict — per-experience keep/remove/modify decisions
            'skill_decisions':         {},   # Dict — per-skill decisions
            'achievement_decisions':   {},   # Dict — per-achievement decisions
            'publication_decisions':   {},   # Dict — per-publication accept/reject decisions
            'summary_focus_override':  None, # str — selected professional summary key
            'extra_skills':            [],   # List[str] — LLM-suggested skills not in master CV
            'achievement_overrides':   {},   # Dict — top-level achievement field edits for this session only
            'removed_achievement_ids': [],   # List[str] — top-level achievements hidden for this session only
            'skill_group_overrides':   {},   # Dict — per-skill group overrides for this session only
            'skill_category_overrides': {},  # Dict — per-skill category overrides for this session only
            'skill_category_order':   [],    # List[str] — category display order overrides for this session only
            'skill_qualifier_overrides': {}, # Dict — per-skill proficiency/subskills/parenthetical overrides for this session only
            'achievement_rewrite_log': [],   # List[Dict] — AI rewrite interactions per achievement
            'generation_state':        {},   # Dict — GAP-20 staged generation phase/artifact state
            'intake':                  {},   # Dict — GAP-23 intake confirmation: company/role/date
        }
        self.session_dir: Optional[Path] = None
        self.session_id: Optional[str] = None
        # Readline history file
        self.history_file: Path = Path(self.config.get('session.history_file', 'files/.input_history'))
    
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
                if self.state['phase'] == Phase.INIT and not self.state['job_description']:
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
                    self._store_job_analysis(analysis)
                    self.state['phase'] = Phase.CUSTOMIZATION
                    print(f"✓ Job analysis complete:\n{json.dumps(analysis, indent=2)}")
                    # Prompt assistant to ask clarifying questions with specific context
                    contextual_prompt = f"""I've analyzed the job description. Here are the key findings:

JOB ANALYSIS:
- Title: {analysis.get('title', 'Not specified')}
- Company: {analysis.get('company', 'Not specified')}  
- Domain: {analysis.get('domain', 'Not specified')}
- Role Level: {analysis.get('role_level', 'Not specified')}
- Required Skills: {', '.join(analysis.get('required_skills', []))}
- Key Requirements: {', '.join(analysis.get('must_have_requirements', []))}

Based on this analysis and my CV data, please ask me 2-3 specific clarifying questions to help customize my CV for this role. Focus on:
1. Which of my experiences should be emphasized/de-emphasized for this specific role
2. How I'd like to position myself relative to the role level and domain
3. Any specific achievements or skills I want highlighted for this company/domain

Ask questions that are specific to this job posting, not generic career questions."""

                    response = self._process_message(contextual_prompt)
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

        # Prepare messages for LLM — strip large context blocks from history entries
        # since the current system prompt already carries the full CV + job analysis.
        messages = [
            {'role': 'system', 'content': system_msg}
        ] + self._strip_context_from_history(self.conversation_history)
        
        # Get LLM response.
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
                # Structured results carry large data in context_data (separate from text)
                # so it can be stripped from history without losing the narrative.
                if isinstance(action_result, dict) and 'text' in action_result:
                    text = action_result['text']
                    entry = {'role': 'system', 'content': f"Action completed: {text}"}
                    if 'context_data' in action_result:
                        entry['context_data'] = action_result['context_data']
                else:
                    text = str(action_result)
                    entry = {'role': 'system', 'content': f"Action completed: {text}"}
                self.conversation_history.append(entry)
                response += f"\n\n{text}"
        
        # Auto-save after each message exchange
        self._save_session()

        return response

    def _strip_context_from_history(self, history: list) -> list:
        """Return history entries with the ``context_data`` key removed.

        ``context_data`` holds large structured objects (job analysis,
        customizations) that are already present in the current system prompt.
        Dropping the key keeps requests within token limits while preserving
        the full conversational narrative in ``content``.
        """
        return [
            {k: v for k, v in entry.items() if k != 'context_data'}
            for entry in history
        ]

    def _build_system_prompt(self) -> str:
        """Build context-aware system prompt."""
        current_phase = self.state['phase']
        base_prompt = f"""You are an AI assistant helping to generate a customized CV.

Your role is to:
1. Analyze job descriptions and understand requirements
2. Ask clarifying questions to understand user's goals and preferences
3. Recommend customizations based on job requirements
4. Guide the user through the CV generation process
5. Help refine and iterate on generated content

CRITICAL - Recommendation Structure:
Every experience and skill recommendation MUST include ALL THREE components below:

1. RECOMMENDATION LEVEL (choose exactly one - based on JOB RELEVANCE):
   - Emphasize: Feature prominently with full details (HIGHLY relevant to job)
   - Include: Standard treatment, include normally (RELEVANT to job)
   - De-emphasize: Brief mention only (SOMEWHAT relevant to job)
   - Omit: Exclude from CV entirely (NOT relevant to job)
   
   THIS IS ABOUT HOW RELEVANT THE EXPERIENCE IS TO THE JOB, NOT CONFIDENCE.

2. CONFIDENCE LEVEL (5-point scale - based on EVIDENCE STRENGTH):
   - Very High: Overwhelming evidence FOR the recommendation, virtually no evidence against
   - High: Strong evidence FOR, minimal evidence against
   - Medium: Moderate evidence FOR, some evidence against OR limited evidence either way
   - Low: Weak evidence FOR, significant evidence against OR very limited evidence
   - Very Low: Minimal evidence FOR, strong evidence against OR almost no relevant evidence
   
   THIS IS ABOUT HOW CERTAIN YOU ARE ABOUT YOUR RECOMMENDATION, NOT RELEVANCE.
   The confidence level reflects the RATIO of supporting evidence to contradicting evidence.
   More supporting evidence + less contradicting evidence = Higher confidence.
   Less supporting evidence + more contradicting evidence = Lower confidence.
   
   IMPORTANT: These are INDEPENDENT:
   - You can have "Emphasize" with "Medium" confidence (very relevant but limited info)
   - You can have "De-emphasize" with "Very High" confidence (clearly not relevant)
   - You can have "Include" with "Low" confidence (seems relevant but uncertain)

3. REASONING & EVIDENCE (required explanation):
   Provide a clear, specific explanation that includes:
   - Which job requirements this experience/skill addresses (or fails to address)
   - Specific achievements, technologies, or outcomes that match (or don't match)
   - Evidence FOR the recommendation (matching skills, relevant domain, level alignment)
   - Evidence AGAINST the recommendation (mismatches, irrelevant aspects, concerns)
   - Why the confidence level is appropriate given the evidence balance
   
   Be specific and concrete. Cite actual requirements from the job description and 
   actual details from the candidate's experience.

MANDATORY FORMAT - All recommendations must follow this structure:
"[Experience/Skill Name]"
- Recommendation: [Emphasize/Include/De-emphasize/Omit]
- Confidence: [Very High/High/Medium/Low/Very Low]
- Reasoning: [Detailed explanation with specific evidence from both the job requirements 
  and candidate's background, explaining both supporting and contradicting factors]

Example:
"Senior Data Scientist at Pfizer (2018-2022)"
- Recommendation: Emphasize
- Confidence: Very High
- Reasoning: Direct match for 4 of 5 key requirements: ML model development in healthcare, 
  team leadership, regulatory environment experience, and Python/R expertise. Pfizer 
  Achievement Award demonstrates exceptional impact. Led 8-person team developing predictive 
  models for clinical trials - exactly matches job's "lead ML initiatives in life sciences" 
  requirement. No contradicting evidence. Very high confidence due to multiple strong matches 
  with zero misalignments.

You can request actions by including JSON in your response:
{{"action": "analyze_job", "job_text": "..."}}
{{"action": "recommend_customizations"}}
{{"action": "generate_cv"}}

Current conversation phase: {current_phase}
"""
        
        # Add candidate background information
        if self.orchestrator and self.orchestrator.master_data:
            master_data = self.orchestrator.master_data
            
            # Provide complete CV data to LLM
            candidate_info = f"""\n\nComplete Candidate CV Data:
{json.dumps(master_data, indent=2)}
"""
            
            # Add publications from BibTeX file
            if self.orchestrator.publications:
                pub_count = len(self.orchestrator.publications)
                pub_summary = []
                for key, pub in list(self.orchestrator.publications.items())[:10]:  # Show first 10 as examples
                    pub_summary.append(f"  - {pub.get('title', 'No title')} ({pub.get('year', 'N/A')})")
                
                candidate_info += f"""\n\nPublications ({pub_count} total):
{chr(10).join(pub_summary)}
{"... and more" if pub_count > 10 else ""}

Complete publications data available in orchestrator.publications.
"""
            
            candidate_info += """
You have complete access to the candidate's CV data including:
- Personal information and contact details
- All professional experiences with achievements and dates
- Complete skills inventory
- Education history
- Publications and certifications

Do NOT ask the candidate for basic information that's already in this data. Focus questions on preferences, emphasis, and job-specific tailoring.

IMPORTANT: Never echo or repeat the CV data JSON structure back to the user. Only reference specific details in natural language when relevant to your response.
"""
            base_prompt += candidate_info
        
        # Add phase-specific context
        if self.state['phase'] == Phase.JOB_ANALYSIS and self.state['job_analysis']:
            base_prompt += f"\n\nJob Analysis Complete:\n{json.dumps(self.state['job_analysis'], indent=2)}"

        if self.state['customizations']:
            base_prompt += f"\n\nRecommended Customizations:\n{json.dumps(self.state['customizations'], indent=2)}"

        if self.state['phase'] == Phase.REWRITE_REVIEW:
            pending = self.state.get('pending_rewrites') or []
            base_prompt += (
                f"\n\nPhase: Rewrite Review\n"
                f"There are {len(pending)} pending rewrite proposal(s). "
                "The user is reviewing before/after diffs of LLM-proposed text rewrites. "
                "If asked, explain the rationale for a specific proposal, clarify why a "
                "particular keyword or phrasing change is beneficial, or help the user "
                "decide whether to accept, edit, or reject a proposal. "
                "Do NOT propose new rewrites in this phase — only respond to questions "
                "about the existing proposals."
            )

        return base_prompt
    
    def _parse_action_from_response(self, response: str) -> Optional[Dict]:
        """Extract action request from LLM response."""
        start = response.find('{"action":')
        if start == -1:
            return None
        try:
            obj, _ = json.JSONDecoder().raw_decode(response, start)
            return obj
        except json.JSONDecodeError:
            return None

    def _extract_structured_questions(self, text: str) -> List[Dict[str, object]]:
        """Extract numbered clarifying questions from free-form LLM text.

        The analyze flow often returns narrative text followed by numbered
        questions (``1.``, ``2.``, ``3.``). This helper converts that output
        into the structured question objects used by the web Questions tab.
        """
        if not text:
            return []

        normalized = text.replace("\r\n", "\n")
        blocks = re.split(r"(?m)^\s*\d+\.\s+", normalized)
        if len(blocks) <= 1:
            return []

        extracted: List[Dict[str, object]] = []
        for idx, block in enumerate(blocks[1:], 1):
            chunk = block.strip()
            if not chunk:
                continue

            # Preserve full question body (including markdown/newlines) so the
            # Questions tab can render rich context without truncation.
            question = chunk.strip()
            if not question:
                continue

            extracted.append({
                "type": f"clarification_{idx}",
                "question": question[:4000],
                "choices": [],
            })

        return extracted[:4]
    
    def _execute_action(self, action: Dict) -> Optional[str]:
        """Execute requested action."""
        action_type = action.get('action')
        
        if action_type == 'analyze_job':
            job_text = action.get('job_text') or self.state.get('job_description')
            if not job_text:
                return "\u274c No job description provided"
            
            print("\n🔄 Analyzing job description...")
            analysis = self.llm.analyze_job_description(
                job_text,
                self.orchestrator.master_data
            )
            self._store_job_analysis(analysis)
            self.state['phase'] = Phase.CUSTOMIZATION
            self.state['post_analysis_questions'] = []
            self.state['post_analysis_answers'] = {}

            # Rename the session directory now that company / role are known
            self._rename_session_dir(
                analysis.get('company', ''),
                analysis.get('title', '')
            )

            # After analysis, prompt for contextual questions  
            contextual_prompt = f"""I've analyzed the job description. Here are the key findings:

JOB ANALYSIS:
- Title: {analysis.get('title', 'Not specified')}
- Company: {analysis.get('company', 'Not specified')}  
- Domain: {analysis.get('domain', 'Not specified')}
- Role Level: {analysis.get('role_level', 'Not specified')}
- Required Skills: {', '.join(analysis.get('required_skills', []))}
- Key Requirements: {', '.join(analysis.get('must_have_requirements', []))}

Based on this analysis and my CV data, please ask me 2-3 specific clarifying questions to help customize my CV for this role. Focus on:
1. Which of my experiences should be emphasized/de-emphasized for this specific role
2. How I'd like to position myself relative to the role level and domain  
3. Any specific achievements or skills I want highlighted for this company/domain

Ask questions that are specific to this job posting, not generic career questions."""
            
            # Get contextual questions from LLM
            try:
                # Build context-aware system message
                system_msg = self._build_system_prompt()
                messages = (
                    [{'role': 'system', 'content': system_msg}]
                    + self._strip_context_from_history(self.conversation_history)
                    + [{'role': 'user', 'content': contextual_prompt}]
                )
                questions_response = self.llm.chat(messages, temperature=0.7)
                
                # Add the questions to conversation history 
                self.conversation_history.append({
                    'role': 'assistant',
                    'content': questions_response
                })

                extracted_questions = self._extract_structured_questions(questions_response)
                if extracted_questions:
                    self.state['post_analysis_questions'] = extracted_questions
                
                return {
                    'text': f"✓ Job analysis complete:\n\n{questions_response}",
                    'context_data': {
                        'job_analysis': analysis,
                        'post_analysis_questions': extracted_questions,
                    },
                }
            except LLMError as e:
                print(f"LLM error generating contextual questions: {e}")
                return {
                    'text': f'✓ Job analysis complete. (Note: {e})',
                    'context_data': {'job_analysis': analysis},
                }
            except Exception as e:
                print(f"Error generating contextual questions: {e}")
                return {
                    'text': '✓ Job analysis complete.',
                    'context_data': {'job_analysis': analysis},
                }
        
        elif action_type == 'recommend_customizations':
            if not self.state['job_analysis']:
                return "❌ Please analyze job description first"
            
            print("\n🔄 Generating customization recommendations...")
            action_preferences = action.get('user_preferences', {}) or {}
            state_preferences = self.state.get('post_analysis_answers', {}) or {}

            user_preferences = {}
            if isinstance(state_preferences, dict):
                user_preferences.update(state_preferences)
            if isinstance(action_preferences, dict):
                user_preferences.update(action_preferences)

            if user_preferences:
                self.state['post_analysis_answers'] = user_preferences

            recommendations = self.llm.recommend_customizations(
                self.state['job_analysis'],
                self.orchestrator.master_data,
                user_preferences=user_preferences,
                conversation_history=self.conversation_history
            )
            self._normalize_recommendations(recommendations)
            self.state['customizations'] = recommendations
            self.state['phase'] = Phase.REWRITE_REVIEW
            
            return {
                'text': f"✓ Customization recommendations generated ({len(recommendations.get('recommended_experiences', []))} experiences, {len(recommendations.get('recommended_skills', []))} skills).",
                'context_data': {'customizations': recommendations},
            }
        
        elif action_type == 'submit_rewrites':
            decisions = action.get('decisions', [])
            summary   = self.submit_rewrite_decisions(decisions)
            return (
                f"✓ Rewrite decisions recorded: "
                f"{summary['approved_count']} approved, "
                f"{summary['rejected_count']} rejected."
            )

        elif action_type == 'generate_cv':
            # Check if we have customizations OR user decisions from table review
            has_customizations = bool(self.state.get('customizations'))
            has_decisions = bool(self.state.get('experience_decisions') or self.state.get('skill_decisions') or self.state.get('achievement_decisions'))
            
            if not has_customizations and not has_decisions:
                return "❌ Please generate customizations first (click 'Recommend Customizations')"
            
            # Ensure job_analysis and customizations are dicts, not strings
            job_analysis = self.state.get('job_analysis')
            if isinstance(job_analysis, str):
                try:
                    job_analysis = json.loads(job_analysis)
                    self.state['job_analysis'] = job_analysis
                except json.JSONDecodeError:
                    return "❌ Error: job_analysis is corrupted. Please re-analyze the job."

            # Normalize decision payloads (may be persisted as JSON strings)
            exp_decisions = self.state.get('experience_decisions', {})
            skill_decisions = self.state.get('skill_decisions', {})

            if isinstance(exp_decisions, str):
                try:
                    exp_decisions = json.loads(exp_decisions)
                    self.state['experience_decisions'] = exp_decisions
                except json.JSONDecodeError:
                    exp_decisions = {}

            if isinstance(skill_decisions, str):
                try:
                    skill_decisions = json.loads(skill_decisions)
                    self.state['skill_decisions'] = skill_decisions
                except json.JSONDecodeError:
                    skill_decisions = {}

            if not isinstance(exp_decisions, dict):
                exp_decisions = {}
            if not isinstance(skill_decisions, dict):
                skill_decisions = {}
            
            # If we have decisions but no customizations, generate a baseline first
            if has_decisions and not has_customizations:
                print("\n🔄 Applying user decisions to generate customizations...")
                if not job_analysis:
                    return "❌ Please analyze job description first"

                recommendations = self.llm.recommend_customizations(
                    job_analysis,
                    self.orchestrator.master_data,
                    user_preferences=self.state.get('post_analysis_answers') or {},
                    conversation_history=self.conversation_history
                )
                self._normalize_recommendations(recommendations)
                self.state['customizations'] = recommendations
            
            # Ensure customizations is a dict
            customizations = self.state.get('customizations')
            if isinstance(customizations, str):
                try:
                    customizations = json.loads(customizations)
                    self.state['customizations'] = customizations
                except json.JSONDecodeError:
                    return "❌ Error: customizations data is corrupted. Please re-generate customizations."

            if customizations is None:
                return "❌ Please generate customizations first"

            # Always apply collected review decisions before final generation
            if has_decisions:
                if exp_decisions:
                    emphasized   = [k for k, v in exp_decisions.items() if v == 'emphasize']
                    included     = [k for k, v in exp_decisions.items() if v == 'include']
                    deemphasized = [k for k, v in exp_decisions.items() if v == 'de-emphasize']
                    omitted      = [k for k, v in exp_decisions.items() if v in ('omit', 'exclude')]
                    customizations['recommended_experiences'] = emphasized + included + deemphasized
                    # Explicitly omitted IDs — only these are excluded from the output
                    customizations['omitted_experiences'] = omitted

                if skill_decisions:
                    emphasized   = [k for k, v in skill_decisions.items() if v == 'emphasize']
                    included     = [k for k, v in skill_decisions.items() if v == 'include']
                    deemphasized = [k for k, v in skill_decisions.items() if v == 'de-emphasize']
                    omitted      = [k for k, v in skill_decisions.items() if v in ('omit', 'exclude')]
                    customizations['recommended_skills'] = emphasized + included + deemphasized
                    customizations['omitted_skills'] = omitted

                # Achievement decisions
                ach_decisions = self.state.get('achievement_decisions', {})
                if isinstance(ach_decisions, str):
                    try:
                        ach_decisions = json.loads(ach_decisions)
                    except Exception:
                        ach_decisions = {}
                if ach_decisions:
                    included_achs = [k for k, v in ach_decisions.items() if v in ('include', 'emphasize', 'de-emphasize')]
                    omitted_achs  = [k for k, v in ach_decisions.items() if v in ('omit', 'exclude')]
                    customizations['recommended_achievements'] = included_achs
                    customizations['omitted_achievements'] = omitted_achs

                # Extra achievements (LLM-suggested achievements that user approved)
                extra_achievements = self.state.get('accepted_suggested_achievements', [])
                if extra_achievements:
                    customizations['extra_achievements'] = extra_achievements

                # Extra skills (LLM-suggested skills not in master CV that user approved)
                extra_skills = self.state.get('extra_skills', [])
                if extra_skills:
                    customizations['extra_skills'] = extra_skills

                # Base font size for CV template (set via Layout panel)
                base_font_size = self.state.get('base_font_size')
                if base_font_size:
                    customizations['base_font_size'] = base_font_size

                self.state['customizations'] = customizations

            # duckflow: {
            #   "id": "summary_state_customizations_handoff",
            #   "kind": "state",
            #   "status": "shared",
            #   "reads": ["state:summary_focus_override", "state:session_summaries.ai_generated"],
            #   "writes": ["customizations:summary_focus", "customizations:session_summaries"],
            #   "notes": "Copies summary selection metadata from top-level session state into the customization payload used by preview and generation."
            # }
            summary_view = SessionDataView(
                self.orchestrator.master_data,
                self.state,
                customizations,
            )
            customizations = summary_view.materialize_customizations()
            self.state['customizations'] = customizations

            # Inject user-defined bullet ordering (Phase 9) into customizations
            achievement_orders = self.state.get('achievement_orders', {})
            if achievement_orders:
                customizations['achievement_orders'] = achievement_orders

            # Inject user-defined experience and skill row ordering (Phase 6)
            experience_row_order = self.state.get('experience_row_order', [])
            if experience_row_order:
                customizations['experience_row_order'] = experience_row_order
            skill_row_order = self.state.get('skill_row_order', [])
            if skill_row_order:
                customizations['skill_row_order'] = skill_row_order

            # Apply publication accept/reject decisions.
            # Primary source: publication_decisions dict stored via POST /api/decide
            # (cite_key → True/False). Falls back to legacy post_analysis_answers strings.
            pub_decisions: dict = self.state.get('publication_decisions') or {}
            if pub_decisions:
                customizations['accepted_publications'] = [
                    k for k, v in pub_decisions.items() if v not in (False, 'reject', 0)
                ]
                customizations['rejected_publications'] = [
                    k for k, v in pub_decisions.items() if v in (False, 'reject', 0)
                ]
            # Legacy path: post_analysis_answers overrides the dict if both are present
            post_answers = self.state.get('post_analysis_answers') or {}
            accepted_str = post_answers.get('publication_accepted', '')
            rejected_str = post_answers.get('publication_rejected', '')
            if accepted_str or rejected_str:
                customizations['accepted_publications'] = [
                    k.strip() for k in accepted_str.split(',') if k.strip()
                ]
                customizations['rejected_publications'] = [
                    k.strip() for k in rejected_str.split(',') if k.strip()
                ]
            
            print("\n🔄 Generating CV files...")
            result = self.orchestrator.generate_cv(
                job_analysis,
                customizations,
                output_dir=self.session_dir,
                approved_rewrites=self.state.get('approved_rewrites') or [],
                rewrite_audit=self.state.get('rewrite_audit') or [],
                spell_audit=self.state.get('spell_audit') or [],
                max_skills=self.state.get('max_skills'),
            )
            self.state['generated_files'] = result
            # Store generation progress for frontend display (Phase 10)
            self.state['generation_progress'] = result.get('generation_progress', [])
            self.state['phase'] = Phase.LAYOUT_REVIEW

            files_list = "\n".join(f"  - {f}" for f in result['files'])
            return f"✓ CV generated successfully!\n\nOutput directory: {result['output_dir']}\n\nFiles created:\n{files_list}"
        
        return None
    
    def submit_rewrite_decisions(self, decisions: List[Dict]) -> Dict:
        """Process user decisions on pending rewrite proposals.

        Each decision dict must contain:
            id         — proposal id (matches a pending_rewrites entry)
            outcome    — "accept" | "reject" | "edit"
            final_text — user-edited text (required when outcome == "edit");
                         None otherwise

        Builds ``approved_rewrites`` (all non-rejected items, with
        ``proposed`` replaced by ``final_text`` for edits) and
        ``rewrite_audit`` (every decision merged with its original proposal).
        Advances phase to ``'generation'`` and persists the session.

        Returns a summary dict: ``{approved_count, rejected_count, phase}``.
        """
        pending_index = {
            r['id']: r
            for r in (self.state.get('pending_rewrites') or [])
        }

        approved: List[Dict] = []
        audit:    List[Dict] = []

        for decision in decisions:
            pid      = decision.get('id', '')
            outcome  = decision.get('outcome', 'reject')
            final    = decision.get('final_text')
            proposal = pending_index.get(pid, {})

            audit.append({
                **proposal,
                'outcome': outcome,
                'final':   final,
            })

            if outcome != 'reject':
                approved_entry = dict(proposal)
                if outcome == 'edit' and final is not None:
                    approved_entry['proposed'] = final
                approved.append(approved_entry)

        self.state['approved_rewrites'] = approved
        self.state['rewrite_audit']     = audit
        self.state['phase']             = Phase.SPELL_CHECK
        self._save_session()

        n_rejected = sum(1 for d in decisions if d.get('outcome') == 'reject')
        return {
            'approved_count': len(approved),
            'rejected_count': n_rejected,
            'phase':          'spell_check',
        }

    def complete_spell_check(self, spell_audit: list) -> Dict:
        """Record spell-check outcomes and advance phase to *generation*.

        Args:
            spell_audit: List of audit entries.  Each entry is a dict with
                keys: ``context_type, location, original, suggestion, rule,
                outcome, final``.

        Returns:
            ``{"flag_count": int, "accepted_count": int, "phase": "generation"}``
        """
        spell_audit = spell_audit or []
        # Resolve any items that somehow arrive still in 'pending' state to 'ignore'
        # so the audit record is always clean before persisting.
        for entry in spell_audit:
            if entry.get('outcome') == 'pending':
                entry['outcome'] = 'ignore'
        self.state['spell_audit'] = spell_audit
        self.state['phase']       = Phase.GENERATION
        self._save_session()
        flag_count      = len(spell_audit)
        accepted_count  = sum(1 for a in spell_audit if a.get('outcome') == 'accept')
        ignored_count   = sum(1 for a in spell_audit if a.get('outcome') in ('ignore', 'add_dict'))
        return {
            'flag_count':     flag_count,
            'accepted_count': accepted_count,
            'ignored_count':  ignored_count,
            'phase':          'generation',
        }

    def complete_layout_review(self, layout_instructions: list) -> Dict:
        """Record layout instruction outcomes and advance phase to *refinement* (finalise).

        Args:
            layout_instructions: List of instruction entries. Each entry should have keys:
                ``timestamp, instruction_text, change_summary, confirmation``.

        Returns:
            ``{"instructions_applied": int, "phase": "refinement"}``
        """
        self.state['layout_instructions'] = layout_instructions or []
        self.state['phase'] = Phase.REFINEMENT
        self._save_session()
        instructions_applied = len(layout_instructions or [])
        return {
            'instructions_applied': instructions_applied,
            'phase': 'refinement',
        }

    def run_persuasion_checks(
        self,
        rewrites: List[Dict],
        job_analysis: Dict,
        master_data: Dict
    ) -> List[Dict]:
        """Run persuasion quality checks on proposed rewrites (Phase 10).

        Applies 8 persuasion checks from LLMClient to each rewrite:
        - Strong action verbs
        - Passive voice / hedging language
        - Word count limits
        - Result clause presence
        - Named institution positioning
        - CAR (Challenge-Action-Result) structure
        - Summary generic phrases

        Args:
            rewrites:     List of proposed rewrite dicts from orchestrator
            job_analysis: Current job analysis dict (for context)
            master_data:  Master CV data dict (for context)

        Returns:
            List of warning dicts, each with keys:
                {
                    'id':          str,            # rewrite id
                    'location':    str,            # e.g. 'summary', 'exp_001.achievements[0]'
                    'flag_type':   str,            # 'strong_action_verb', 'passive_voice', etc.
                    'severity':    'warn'|'info',  # 'warn' = user should review, 'info' = note
                    'original':    str,            # original text
                    'proposed':    str,            # proposed text
                    'details':     str,            # explanation
                }

        If rewrites is empty, returns [].
        Errors (e.g., from check functions) are logged as warnings and do not
        block the process.
        """
        if not rewrites:
            return []

        warnings_list: List[Dict] = []

        for rewrite in rewrites:
            rewrite_id = rewrite.get('id', '')
            location = rewrite.get('location', '')
            original = rewrite.get('original', '')
            proposed = rewrite.get('proposed', '')
            rewrite_type = rewrite.get('type', '')

            # Skip non-text rewrites (e.g., skill_add)
            if not proposed or not original:
                continue

            # ── Run all persuasion checks ─────────────────────────────────────

            checks_to_run = []

            # Always check: strong action verb (bullets and summary)
            if proposed:
                verb_result = LLMClient.check_strong_action_verb(proposed)
                checks_to_run.append(verb_result)

            # Always check: passive voice
            passive_result = LLMClient.check_passive_voice(proposed)
            checks_to_run.append(passive_result)

            # Always check: word count
            wordcount_result = LLMClient.check_word_count(proposed)
            checks_to_run.append(wordcount_result)

            # Always check: result clause
            result_result = LLMClient.check_has_result_clause(proposed)
            checks_to_run.append(result_result)

            # Always check: hedging language
            hedging_result = LLMClient.check_hedging_language(proposed)
            checks_to_run.append(hedging_result)

            # Named institution positioning (if text seems like experience bullet)
            if 'exp' in location.lower() or 'bullet' in rewrite_type.lower():
                institution_result = LLMClient.check_named_institution_position(proposed)
                checks_to_run.append(institution_result)

            # CAR structure (experience bullets)
            if 'exp' in location.lower():
                car_result = LLMClient.check_car_structure(proposed)
                checks_to_run.append(car_result)

            # Generic phrases (summary only)
            if location == 'summary' or rewrite_type == 'summary':
                generic_result = LLMClient.check_summary_generic_phrases(proposed)
                checks_to_run.append(generic_result)

            # ── Collect failures (pass=False) as warnings ────────────────────

            for check_result in checks_to_run:
                if not check_result.get('pass', True):
                    warnings_list.append({
                        'id':        rewrite_id,
                        'location':  location,
                        'flag_type': check_result.get('flag_type', 'unknown'),
                        'severity':  check_result.get('severity', 'info'),
                        'original':  original,
                        'proposed':  proposed,
                        'details':   check_result.get('details', ''),
                    })

        return warnings_list

    # ── Phase re-entry / iterative refinement ────────────────────────────────

    # Mapping from logical step name (frontend) → internal Phase enum value
    _STEP_TO_PHASE: Dict[str, Phase] = {
        'job':            Phase.INIT,
        'analysis':       Phase.JOB_ANALYSIS,
        'customizations': Phase.CUSTOMIZATION,
        'rewrite':        Phase.REWRITE_REVIEW,
        'spell':          Phase.SPELL_CHECK,
        'generate':       Phase.GENERATION,
        'layout':         Phase.LAYOUT_REVIEW,
    }

    def extract_intake_metadata(self) -> Dict[str, Optional[str]]:
        """Extract company, role, and suggested date from the stored job description.

        Uses fast heuristic parsing (no LLM call).  Returns a dict with keys:
        ``role``, ``company``, ``date_applied`` (ISO YYYY-MM-DD today).
        Any field not determinable is ``None``.
        """
        import re as _re
        job_text = self.state.get('job_description') or ''
        lines = [ln.strip() for ln in job_text.splitlines() if ln.strip()]

        title   = lines[0] if lines else ''
        company = lines[1] if len(lines) > 1 else ''

        if ' at ' in title.lower() and not company:
            parts = title.split(' at ', 1)
            if len(parts) == 2:
                title, company = parts[0].strip(), parts[1].strip()

        if not company:
            for pattern in [
                r'(?:Company|Employer|Organisation|Organization)[:\s]+([^\n]+)',
                r'(?:^|\s)(?:at|@)\s+([A-Z][A-Za-z0-9\s,\.&\-]+?)(?:\s*[–\-\|]|\s*\n|$)',
            ]:
                m = _re.search(pattern, job_text, _re.IGNORECASE | _re.MULTILINE)
                if m:
                    company = m.group(1).strip()[:80]
                    break

        return {
            'role':         (title[:120]   if title   else None),
            'company':      (company[:120] if company else None),
            'date_applied': datetime.now().strftime('%Y-%m-%d'),
        }

    def _build_downstream_context(self) -> str:
        """Build a plain-English context string summarising prior session decisions.

        Used by :meth:`re_run_phase` to augment LLM prompts with the user's
        previous choices so re-runs improve on the last pass rather than
        starting blind.

        Returns an empty string when no relevant prior decisions exist.
        """
        parts = []

        approved = self.state.get('approved_rewrites') or []
        if approved:
            parts.append(
                f"Previously approved {len(approved)} text rewrite(s). "
                "Preserve terminology and tone of accepted rewrites."
            )

        exp_dec = self.state.get('experience_decisions') or {}
        if exp_dec:
            omitted = [k for k, v in exp_dec.items() if v == 'omit']
            emph    = [k for k, v in exp_dec.items() if v == 'emphasize']
            if omitted:
                parts.append(f"User omitted experiences: {', '.join(omitted)}.")
            if emph:
                parts.append(f"User emphasised experiences: {', '.join(emph)}.")

        skill_dec = self.state.get('skill_decisions') or {}
        if skill_dec:
            omitted = [k for k, v in skill_dec.items() if v == 'omit']
            if omitted:
                parts.append(f"User omitted skills: {', '.join(omitted)}.")

        spell_audit = self.state.get('spell_audit') or []
        accepted_fixes = [a for a in spell_audit if a.get('outcome') == 'accept']
        if accepted_fixes:
            parts.append(
                f"Spell-check accepted {len(accepted_fixes)} correction(s). "
                "Maintain corrected spellings."
            )

        return "  ".join(parts) if parts else ""

    def back_to_phase(self, target_phase: str) -> Dict:
        """Navigate back to *target_phase* without clearing downstream state.

        All prior decisions, accepted rewrites, customisations, and generated
        content are preserved so the next generation pass can improve on the
        last rather than starting fresh.

        The ``iterating`` flag lets generation endpoints know they should
        append a ``prior_context`` summary block to the LLM prompt.

        Returns a summary dict for the API response.
        """
        # Accept either frontend step labels or internal phase strings
        resolved = self._STEP_TO_PHASE.get(target_phase, target_phase)

        self.state['iterating']     = True
        self.state['reentry_phase'] = resolved
        self.state['phase']         = resolved
        self._save_session()

        return {
            'ok':            True,
            'phase':         resolved,
            'iterating':     True,
            'reentry_phase': resolved,
        }

    def re_run_phase(self, target_phase: str) -> Dict:
        """Re-execute the LLM call for *target_phase* with downstream context.

        The prior output for the phase is preserved as ``prior_<key>`` in
        state so the frontend can diff the new vs old results.  Downstream
        approvals (rewrites, spell-check, customisation decisions) are
        preserved and included in the new LLM prompt as structured context.

        Supported target phases (by logical step name or internal phase):
            - ``'analysis'`` / ``'job_analysis'``
            - ``'customizations'`` / ``'customization'``
            - ``'rewrite'`` / ``'rewrite_review'``

        Returns ``{ok, phase, prior_output, new_output}`` on success.
        """
        resolved = self._STEP_TO_PHASE.get(target_phase, target_phase)

        prior_output: Dict = {}
        new_output:   Dict = {}

        # ── Build downstream-context text ────────────────────────────────────
        ctx = self._build_downstream_context()

        # ── Re-run phase-specific LLM call ───────────────────────────────────
        if resolved in (Phase.INIT, Phase.JOB_ANALYSIS):
            job_text = self.state.get('job_description')
            if not job_text:
                return {'ok': False, 'error': 'No job description available'}
            prior_output = {'job_analysis': self.state.get('job_analysis')}
            analysis = self.llm.analyze_job_description(
                job_text, self.orchestrator.master_data
            )
            self._store_job_analysis(analysis)
            # Reset downstream flags so the user re-approves from the new analysis
            self.state['iterating']     = True
            self.state['reentry_phase'] = resolved
            self.state['phase']         = Phase.CUSTOMIZATION
            new_output = {'job_analysis': analysis}

        elif resolved == Phase.CUSTOMIZATION:
            if not self.state.get('job_analysis'):
                return {'ok': False, 'error': 'Job analysis not available'}
            prior_output = {'customizations': self.state.get('customizations')}
            user_prefs = dict(self.state.get('post_analysis_answers') or {})
            if ctx:
                user_prefs['_prior_context'] = ctx
            recommendations = self.llm.recommend_customizations(
                self.state['job_analysis'],
                self.orchestrator.master_data,
                user_preferences=user_prefs,
                conversation_history=self.conversation_history,
            )
            self._normalize_recommendations(recommendations)
            self.state['customizations'] = recommendations
            self.state['iterating']      = True
            self.state['reentry_phase']  = resolved
            self.state['phase']          = Phase.CUSTOMIZATION
            new_output = {'customizations': recommendations}

        elif resolved == Phase.REWRITE_REVIEW:
            if not self.state.get('job_analysis'):
                return {'ok': False, 'error': 'Job analysis not available'}
            prior_output = {'pending_rewrites': self.state.get('pending_rewrites')}
            rewrites = self.orchestrator.propose_rewrites(
                self.orchestrator.master_data,
                self.state['job_analysis'],
            )

            # Run persuasion quality checks on rewrites (Phase 10)
            persuasion_warnings = self.run_persuasion_checks(
                rewrites,
                self.state['job_analysis'],
                self.orchestrator.master_data
            )

            self.state['pending_rewrites']    = rewrites
            self.state['persuasion_warnings'] = persuasion_warnings
            self.state['iterating']           = True
            self.state['reentry_phase']       = resolved
            self.state['phase']               = Phase.REWRITE_REVIEW
            new_output = {
                'pending_rewrites':    rewrites,
                'persuasion_warnings': persuasion_warnings,
            }

        elif resolved in (Phase.SPELL_CHECK, Phase.GENERATION, Phase.LAYOUT_REVIEW):
            # For spell-check, generation, and layout re-entry: navigate back and
            # set iterating flag so the next run builds on prior context.
            prior_output = {
                'generated_files':  self.state.get('generated_files'),
                'pending_rewrites': self.state.get('pending_rewrites'),
            }
            self.state['iterating']     = True
            self.state['reentry_phase'] = resolved
            self.state['phase']         = resolved
            new_output = {'phase': str(resolved)}

        else:
            return {'ok': False, 'error': f'Re-run not supported for phase: {resolved!r}'}

        self._save_session()
        return {
            'ok':           True,
            'phase':        self.state['phase'],
            'prior_output': prior_output,
            'new_output':   new_output,
        }


    def add_job_description(self, job_text: str):
        """Add job description to state."""
        self.state['job_description'] = job_text
        self.state['phase'] = Phase.JOB_ANALYSIS
    
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
    
    def _normalize_recommendations(self, recommendations: Dict) -> Dict:
        """If ``summary_focus`` is a full-text paragraph rather than a lookup
        key, save it as ``'ai_recommended'`` in ``session_summaries`` and
        replace the field with that key so the orchestrator can resolve it.

        Returns the (possibly mutated) recommendations dict.
        """
        summary_focus = recommendations.get('summary_focus', '')
        if isinstance(summary_focus, str) and len(summary_focus) > 60 and ' ' in summary_focus:
            session_summaries = self.state.get('session_summaries') or {}
            session_summaries['ai_recommended'] = summary_focus
            self.state['session_summaries'] = session_summaries
            recommendations['summary_focus'] = 'ai_recommended'
        return recommendations

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
                'phase':              Phase.INIT,
                'position_name':      None,
                'job_description':    None,
                'job_analysis':       None,
                'post_analysis_questions': [],
                'post_analysis_answers':   {},
                'customizations':     None,
                'generated_files':    None,
                'pending_rewrites':   None,
                'approved_rewrites':  [],
                'rewrite_audit':      [],
                'cover_letter_text':   None,
                'cover_letter_params': None,
                'cover_letter_reused_from': None,
                'screening_responses': [],
                'experience_decisions':   {},
                'skill_decisions':         {},
                'achievement_decisions':   {},
                'publication_decisions':   {},
                'summary_focus_override':  None,
                'extra_skills':            [],
                'achievement_overrides':   {},
                'removed_achievement_ids': [],
                'skill_group_overrides':   {},
                'achievement_rewrite_log': [],
            }
            print("\n✓ Conversation reset. Let's start fresh!")
        else:
            print("\n✓ Reset cancelled.")

    def log_achievement_rewrite(
        self,
        original_text: str,
        experience_context: str,
        user_instructions: str,
        previous_suggestions: list,
        suggested_text: str,
        experience_index: Optional[int] = None,
        achievement_index: Optional[int] = None,
    ) -> str:
        """Record one AI rewrite generation in the session and persist.

        Returns the unique ``log_id`` for this entry so the caller can later
        update its outcome via :meth:`update_achievement_rewrite_outcome`.
        """
        log_id = uuid.uuid4().hex[:12]
        entry: Dict = {
            'log_id':              log_id,
            'timestamp':           datetime.now().isoformat(),
            'original_text':       original_text,
            'experience_context':  experience_context,
            'experience_index':    experience_index,
            'achievement_index':   achievement_index,
            'user_instructions':   user_instructions,
            'previous_suggestions': list(previous_suggestions),
            'suggested_text':      suggested_text,
            'outcome':             'pending',
            'accepted_text':       None,
        }
        if 'achievement_rewrite_log' not in self.state:
            self.state['achievement_rewrite_log'] = []
        self.state['achievement_rewrite_log'].append(entry)
        self._save_session()
        return log_id

    def _get_experience_achievement_texts(self, experience_index: int) -> List[str]:
        """Return plain-text achievements for one master CV experience."""
        master_data = getattr(self.orchestrator, 'master_data', None) or {}
        experiences = master_data.get('experience') or []
        if not (0 <= experience_index < len(experiences)):
            return []

        experience = experiences[experience_index] or {}
        achievements = experience.get('key_achievements') or experience.get('achievements') or []

        texts: List[str] = []
        for achievement in achievements:
            if isinstance(achievement, str):
                texts.append(achievement)
                continue
            if isinstance(achievement, dict):
                texts.append(
                    achievement.get('text')
                    or achievement.get('description')
                    or achievement.get('content')
                    or ''
                )
                continue
            texts.append('')
        return texts

    def _persist_accepted_achievement_rewrite(
        self,
        experience_index: int,
        achievement_index: int,
        accepted_text: str,
    ) -> bool:
        """Persist an accepted rewrite into session achievement edits immediately."""
        if not accepted_text:
            return False
        if experience_index < 0 or achievement_index < 0:
            return False

        raw_edits = self.state.get('achievement_edits') or {}
        normalized_edits: Dict[int, List[str]] = {}
        for key, value in raw_edits.items():
            try:
                exp_idx = int(key)
            except (TypeError, ValueError):
                continue
            normalized_edits[exp_idx] = list(value) if isinstance(value, list) else [str(value)]

        edits = normalized_edits.get(experience_index)
        if edits is None:
            edits = self._get_experience_achievement_texts(experience_index)
        else:
            edits = list(edits)

        while len(edits) <= achievement_index:
            edits.append('')

        edits[achievement_index] = accepted_text
        normalized_edits[experience_index] = edits
        self.state['achievement_edits'] = normalized_edits
        return True

    def update_achievement_rewrite_outcome(
        self,
        log_id: str,
        outcome: str,
        accepted_text: Optional[str] = None,
    ) -> bool:
        """Update the outcome of a previously logged AI rewrite entry.

        ``outcome`` should be ``"accepted"`` or ``"rejected"``.  Returns
        ``True`` if the entry was found and updated, ``False`` otherwise.
        """
        for entry in self.state.get('achievement_rewrite_log') or []:
            if entry.get('log_id') == log_id:
                entry['outcome'] = outcome
                if accepted_text is not None:
                    entry['accepted_text'] = accepted_text
                if outcome == 'accepted' and accepted_text is not None:
                    exp_idx = entry.get('experience_index')
                    ach_idx = entry.get('achievement_index')
                    if isinstance(exp_idx, int) and isinstance(ach_idx, int):
                        self._persist_accepted_achievement_rewrite(
                            experience_index=exp_idx,
                            achievement_index=ach_idx,
                            accepted_text=accepted_text,
                        )
                self._save_session()
                return True
        return False

    def save_session(self):
        """Public alias for _save_session."""
        self._save_session()

    def _save_session(self):
        """Save conversation session."""
        try:
            # Don't create a pending_ folder if the session has no meaningful content yet.
            # A session with no job_description and no existing directory is an empty
            # in-memory shell — there's nothing worth persisting to disk.
            if not self.session_dir and not self.state.get('job_description'):
                logger.debug(
                    "_save_session: skipping (no session_dir and no job_description)"
                )
                return

            if not self.session_dir:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                # Sessions live alongside generated files under the output dir.
                # Use a placeholder name; _rename_session_dir() will rename it
                # once company / role are extracted from the job analysis.
                output_base = Path(self.config.get('data.output_dir', '~/CV/files')).expanduser()
                self.session_dir = output_base / f"pending_{timestamp}"
                print(f"Creating session directory: {self.session_dir}")
                logger.debug("_save_session: creating new session_dir=%s", self.session_dir)
                self.session_dir.mkdir(parents=True, exist_ok=True)
            
            if self.session_id is None:
                self.session_id = uuid.uuid4().hex[:8]

            session_data = {
                'session_id': self.session_id,
                'timestamp': datetime.now().isoformat(),
                'state': self.state,
                'conversation_history': self.conversation_history
            }
            
            session_file = self.session_dir / "session.json"
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2)
            
            print(f"✓ Session saved to: {session_file}")
        except Exception as e:
            import traceback
            print(f"❌ Error saving session: {e}")
            print(f"   Session dir: {self.session_dir}")
            print(f"   Position name: {self.state.get('position_name')}")
            traceback.print_exc()
            raise

    def _store_job_analysis(self, analysis: dict) -> None:
        """Store job analysis and update position_name from LLM-extracted title/company."""
        self.state['job_analysis'] = analysis
        title   = (analysis.get('title')   or '').strip()
        company = (analysis.get('company') or '').strip()
        
        if title and company:
            self.state['position_name'] = f"{title} at {company}"
        elif title:
            self.state['position_name'] = title
        elif company:
            self.state['position_name'] = company
        
        logger.debug(
            "_store_job_analysis: position_name=%s (title=%s, company=%s)",
            self.state.get('position_name', '<none>'), title or '<none>', company or '<none>'
        )

    def _rename_session_dir(self, company: str, role: str) -> None:
        """Rename the session directory from ``pending_<ts>`` to
        ``{Company}_{RoleSlug}_{date}`` once company and role are known.

        Safe to call multiple times; only acts when the directory name still
        starts with ``pending_``.  If no session directory exists yet, one is
        created first.
        """
        if not self.session_dir:
            self._save_session()

        if not (self.session_dir and self.session_dir.name.startswith('pending_')):
            return  # Already renamed or directory not yet established

        # Build a filesystem-safe slug from the extracted company and role
        company_slug = re.sub(r'[^\w]', '', company)[:30] or 'Unknown'
        role_slug    = re.sub(r'[^\w ]', '', role).replace(' ', '')[:20] or 'Role'
        date_str     = datetime.now().strftime("%Y-%m-%d")
        new_name     = f"{company_slug}_{role_slug}_{date_str}"
        new_dir      = self.session_dir.parent / new_name

        # Avoid collision with a pre-existing directory of the same name
        if new_dir.exists() and new_dir != self.session_dir:
            counter = 1
            while new_dir.exists():
                new_dir = self.session_dir.parent / f"{new_name}_{counter}"
                counter += 1

        self.session_dir.rename(new_dir)
        self.session_dir = new_dir
        print(f"\u2713 Session directory renamed \u2192 {new_dir.name}")
        logger.debug(
            "_rename_session_dir: renamed to %s (company=%s, role=%s)",
            new_dir.name, company, role
        )
        # Persist the new path into session.json
        self._save_session()

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
        """List known position names by scanning the output directory for
        session.json files and reading their ``state.position_name`` field."""
        output_base = Path(self.config.get('data.output_dir', '~/CV/files')).expanduser()
        if not output_base.exists():
            return []
        names: List[str] = []
        for session_file in output_base.rglob('session.json'):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                pos_name = data.get('state', {}).get('position_name')
                if pos_name and pos_name not in names:
                    names.append(pos_name)
            except Exception:
                pass
        return sorted(names)

    def _load_latest_session_for_position(self, name: str) -> bool:
        """Load the most recent session for a given position name, if any.

        Searches the output directory for session.json files whose
        ``state.position_name`` matches *name*, then loads the most recently
        modified one.
        """
        output_base = Path(self.config.get('data.output_dir', '~/CV/files')).expanduser()
        if not output_base.exists():
            return False
        candidates = [
            sf for sf in output_base.rglob('session.json')
            if self._session_matches_position(sf, name)
        ]
        if not candidates:
            return False
        # Most recently modified first
        candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        try:
            self.load_session(str(candidates[0]))
            return True
        except Exception:
            return False

    def _session_matches_position(self, session_file: Path, name: str) -> bool:
        """Return True if the session.json belongs to the named position."""
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get('state', {}).get('position_name') == name
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
        if 'post_analysis_questions' not in self.state:
            self.state['post_analysis_questions'] = []
        if 'post_analysis_answers' not in self.state:
            self.state['post_analysis_answers'] = {}
        if 'pending_rewrites' not in self.state:
            self.state['pending_rewrites'] = None
        if 'persuasion_warnings' not in self.state:
            self.state['persuasion_warnings'] = []
        if 'generation_progress' not in self.state:
            self.state['generation_progress'] = []
        if 'approved_rewrites' not in self.state:
            self.state['approved_rewrites'] = []
        if 'rewrite_audit' not in self.state:
            self.state['rewrite_audit'] = []
        if 'achievement_rewrite_log' not in self.state:
            self.state['achievement_rewrite_log'] = []
        if 'generation_state' not in self.state:
            self.state['generation_state'] = {}
        if 'intake' not in self.state:
            self.state['intake'] = {}
        self.conversation_history = session_data['conversation_history']
        self.session_dir = Path(session_file).parent

        # Load session_id; generate and save back if absent (backward compat)
        if 'session_id' in session_data:
            self.session_id = session_data['session_id']
            logger.debug("load_session: loaded session_id=%s from file", self.session_id)
        else:
            self.session_id = uuid.uuid4().hex[:8]
            logger.debug(
                "load_session: generated new session_id=%s (backward compat)",
                self.session_id
            )
            self._save_session()
    
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
        self._store_job_analysis(analysis)
        print("✓ Job analysis complete")
        
        # Get recommendations
        print("Getting LLM recommendations...")
        recommendations = self.llm.recommend_customizations(
            analysis,
            self.orchestrator.master_data
        )
        self._normalize_recommendations(recommendations)
        self.state['customizations'] = recommendations
        print("✓ Recommendations complete")

        # Generate
        print("Generating CV...")
        result = self.orchestrator.generate_cv(
            analysis,
            recommendations,
            approved_rewrites=self.state.get('approved_rewrites') or [],
            rewrite_audit=self.state.get('rewrite_audit') or [],
            spell_audit=self.state.get('spell_audit') or [],
            max_skills=self.state.get('max_skills'),
        )
        self.state['generated_files'] = result

        return result

    @staticmethod
    def normalize_skills_data(skills_data) -> List[str]:
        """Normalize skills data to a canonical flat list format.

        Accepts multiple schema formats:
        - Flat list: []
        - Dict of categories with 'skills' key: {cat_name: {skills: [...]}}
        - Dict of lists (legacy): {cat_name: [...]}

        Returns a flat list [skills...] as the canonical format.

        Parameters
        ----------
        skills_data
            Raw skills data in any of the supported formats

        Returns
        -------
        List[str]
            Normalized flat list of skills
        """
        if not skills_data:
            return []

        # Already a flat list
        if isinstance(skills_data, list):
            return skills_data

        # Dict of categories
        if isinstance(skills_data, dict):
            all_skills = []
            for category_data in skills_data.values():
                # Category with nested 'skills' key
                if isinstance(category_data, dict) and 'skills' in category_data:
                    category_skills = category_data.get('skills', [])
                    if isinstance(category_skills, list):
                        all_skills.extend(category_skills)
                # Legacy: category_data is directly a list
                elif isinstance(category_data, list):
                    all_skills.extend(category_data)
            return all_skills

        return []
