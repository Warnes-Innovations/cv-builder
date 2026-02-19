"""
LLM Client abstraction for different providers.

Supports:
- OpenAI (GPT-4, etc.)
- Anthropic (Claude)
- Google Gemini
- Groq (Fast inference)
- Local models via transformers
- GitHub Copilot (if available)
"""

import os
import json
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Abstract base class for LLM clients."""
    
    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send messages and get response."""
        pass
    
    @abstractmethod
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using LLM."""
        pass
    
    @abstractmethod
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for CV customization."""
        pass
    
    @abstractmethod
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity score."""
        pass


class OpenAIClient(LLMClient):
    """OpenAI GPT client."""
    
    def __init__(self, model: str = "gpt-4", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not found. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to OpenAI."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using GPT."""
        prompt = f"""Analyze this job description and extract:
1. Key requirements (must-have vs. nice-to-have)
2. Required skills and technologies
3. Domain focus (data science, biostatistics, ML engineering, etc.)
4. Role level (IC, senior IC, staff, principal, leadership)
5. Company culture indicators
6. Top 10 keywords for ATS optimization

Job Description:
{job_text}

Return as JSON with these fields:
- title: str
- company: str (if mentioned)
- domain: str
- role_level: str
- required_skills: List[str]
- preferred_skills: List[str]
- must_have_requirements: List[str]
- nice_to_have_requirements: List[str]
- culture_indicators: List[str]
- ats_keywords: List[str]
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at analyzing job descriptions for CV optimization."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.3)
        
        # Parse JSON response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise
    
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for customization with 3-part structure."""
        
        # Extract skills list from master_data
        skills_data = master_data.get('skills', [])
        all_skills = []
        if isinstance(skills_data, dict):
            # If skills is a dict with categories, extract skills from each category
            for category_data in skills_data.values():
                if isinstance(category_data, dict) and 'skills' in category_data:
                    # Each category has {'category': name, 'skills': [list of skills]}
                    category_skills = category_data.get('skills', [])
                    if isinstance(category_skills, list):
                        all_skills.extend(category_skills)
                elif isinstance(category_data, list):
                    # Handle legacy format where category_data is directly a list
                    all_skills.extend(category_data)
        elif isinstance(skills_data, list):
            all_skills = skills_data
        
        # Build user preferences context
        user_context = ""
        if user_preferences:
            user_context = "\n\n" + "="*80 + "\n"
            user_context += "🚨 CRITICAL USER INSTRUCTIONS - THESE OVERRIDE ALL OTHER CONSIDERATIONS:\n"
            user_context += "="*80 + "\n"
            for pref_type, pref_value in user_preferences.items():
                user_context += f"\n{pref_type.upper()}:\n{pref_value}\n"
            user_context += "\n" + "="*80 + "\n"
            user_context += "COMPLIANCE REQUIRED:\n"
            user_context += "- If user says 'omit' or 'exclude' specific companies/experiences by name, set recommendation to 'Omit'\n"
            user_context += "- If user says 'focus on' or 'emphasize' specific types of work, set those to 'Emphasize'\n"
            user_context += "- If user mentions specific achievements/projects to highlight, ensure related experiences are 'Emphasize' or 'Include'\n"
            user_context += "- Extract company names and keywords from user instructions and apply them literally\n"
            user_context += "="*80 + "\n\n"
        
        # Add conversation history if available
        conversation_context = ""
        if conversation_history:
            conversation_context = "\n\nRecent Conversation History:\n"
            conversation_context += "-"*80 + "\n"
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                role = msg.get('role', 'unknown').capitalize()
                content = msg.get('content', '')[:300]  # Truncate long messages
                conversation_context += f"{role}: {content}\n\n"
            conversation_context += "-"*80 + "\n"
            conversation_context += "Review this conversation for additional user preferences and instructions.\n\n"
        
        prompt = f"""Based on this job analysis and candidate's master CV data, provide detailed recommendations.{user_context}{conversation_context}

Job Analysis:
{json.dumps(job_analysis, indent=2)}

Candidate Data Summary:
- {len(master_data.get('experience', []))} experiences
- {len(all_skills)} skills
- {len(master_data.get('selected_achievements', []))} key achievements

STEP 1: Before making recommendations, extract key instructions from user preferences above:
- List any company names, organizations, or experience IDs user wants to OMIT/EXCLUDE
- List any types of work, projects, or skills user wants to EMPHASIZE/FOCUS ON
- List any specific achievements or awards user wants to HIGHLIGHT

STEP 2: Review all experiences and match against user instructions:

Available Experiences:"""
            
        # Add detailed experience list with company names
        for exp in master_data.get('experience', []):
            exp_id = exp.get('id', '')
            title = exp.get('title', '')
            company = exp.get('company', '')
            prompt += f"\n- {exp_id}: {title} at {company}"
        
        prompt += f"""

STEP 3: For EACH experience above, provide THREE independent pieces of information:

1. RECOMMENDATION LEVEL (choose exactly one - based on JOB RELEVANCE):
   - "Emphasize": Highly relevant - feature prominently with full details
   - "Include": Relevant - include with standard treatment
   - "De-emphasize": Marginally relevant - brief mention only
   - "Omit": Not relevant - exclude from this CV

2. CONFIDENCE LEVEL (5-point scale - based on EVIDENCE STRENGTH):
   - "Very High": Overwhelming evidence from CV that supports this recommendation
   - "High": Strong evidence clearly supports this recommendation
   - "Medium": Moderate evidence, some assumptions made
   - "Low": Limited evidence, significant assumptions
   - "Very Low": Very limited evidence, highly speculative

   THIS IS ABOUT HOW CERTAIN YOU ARE ABOUT YOUR RECOMMENDATION, NOT RELEVANCE.

3. REASONING: 2-3 sentences explaining:
   - Why you made this recommendation (job match, relevance, etc.)
   - What evidence supports your confidence level
   - Any assumptions you made

IMPORTANT: These are INDEPENDENT dimensions!
- You can have "Emphasize" with "Medium Confidence" (very relevant but uncertain if CV truly demonstrates it)
- You can have "De-emphasize" with "Very High Confidence" (clearly not relevant, very certain about this)
- You can have "Include" with "High Confidence" (relevant and clearly demonstrated)

For SKILLS, provide the same 3-part structure for skills that are particularly relevant or irrelevant.
You don't need to provide recommendations for every single skill, but focus on:
- Skills that are highly relevant to the job (Emphasize/Include)
- Skills that might be misleading or irrelevant (De-emphasize/Omit)

Return as JSON with:
{{
  "experience_recommendations": [
    {{
      "id": "exp_001",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence": "Very High|High|Medium|Low|Very Low",
      "reasoning": "Detailed explanation of why this recommendation was made and the evidence supporting it"
    }},
    ...
  ],
  "skill_recommendations": [
    {{
      "skill": "Python",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence": "Very High|High|Medium|Low|Very Low",
      "reasoning": "Brief explanation of relevance"
    }},
    ...
  ],
  "recommended_skills": ["skill1", "skill2", ...],
  "recommended_achievements": ["achievement_id1", ...],
  "summary_focus": "Brief description of what to emphasize in professional summary",
  "reasoning": "Overall strategy for this CV customization"
}}

Be thorough - provide recommendations for ALL {len(master_data.get('experience', []))} experiences using their exact IDs."""
        
        messages = [
            {"role": "system", "content": "You are an expert at CV optimization. You provide structured recommendations with clear reasoning and confidence assessments."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.5)
        
        try:
            result = json.loads(response)
            # Add backwards compatibility - populate recommended_experiences from experience_recommendations
            if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                result['recommended_experiences'] = [
                    rec['id'] for rec in result['experience_recommendations']
                    if rec.get('recommendation') in ['Emphasize', 'Include']
                ]
            return result
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse LLM response as JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
                # Add backwards compatibility
                if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                    result['recommended_experiences'] = [
                        rec['id'] for rec in result['experience_recommendations']
                        if rec.get('recommendation') in ['Emphasize', 'Include']
                    ]
                return result
            elif "```" in response:
                # Try any code block
                json_str = response.split("```")[1].split("```")[0].strip()
                # Remove language identifier if present
                if json_str.startswith('json\n'):
                    json_str = json_str[5:]
                result = json.loads(json_str)
                # Add backwards compatibility
                if 'experience_recommendations' in result and not result.get('recommended_experiences'):
                    result['recommended_experiences'] = [
                        rec['id'] for rec in result['experience_recommendations']
                        if rec.get('recommendation') in ['Emphasize', 'Include']
                    ]
                return result
            
            # Return a default response structure with new format
            print("Warning: Returning default recommendations")
            return {
                "experience_recommendations": [],
                "recommended_experiences": [],  # Keep for backwards compatibility
                "recommended_skills": [],
                "recommended_achievements": [],
                "summary_focus": "general",
                "reasoning": "Failed to parse LLM response"
            }
    
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity using embeddings."""
        # Use OpenAI embeddings for semantic similarity
        try:
            content_embedding = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=content
            ).data[0].embedding
            
            req_text = " ".join(requirements)
            req_embedding = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=req_text
            ).data[0].embedding
            
            # Cosine similarity
            import numpy as np
            similarity = np.dot(content_embedding, req_embedding) / (
                np.linalg.norm(content_embedding) * np.linalg.norm(req_embedding)
            )
            
            return float(similarity)
        except Exception:
            # Fallback to simple keyword matching
            return self._fallback_match(content, requirements)
    
    def _fallback_match(self, content: str, requirements: List[str]) -> float:
        """Simple keyword matching fallback."""
        content_lower = content.lower()
        matches = sum(1 for req in requirements if req.lower() in content_lower)
        return matches / len(requirements) if requirements else 0.0


class AnthropicClient(LLMClient):
    """Anthropic Claude client."""
    
    def __init__(self, model: str = "claude-3-opus-20240229", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable."
            )
        
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "Anthropic package not installed. Run: pip install anthropic"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to Claude."""
        # Extract system message if present
        system_msg = None
        user_messages = []
        
        for msg in messages:
            if msg['role'] == 'system':
                system_msg = msg['content']
            else:
                user_messages.append(msg)
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system_msg,
            messages=user_messages
        )
        
        return response.content[0].text
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using Claude (similar to OpenAI implementation)."""
        # Implementation similar to OpenAI but using Claude's format
        # ... (similar logic)
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Dict = None, conversation_history: List[Dict] = None) -> Dict:
        """Get recommendations from Claude."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using Claude."""
        # Claude doesn't have native embeddings API, use prompting
        pass


class GeminiClient(LLMClient):
    """Google Gemini client."""
    
    def __init__(self, model: str = "gemini-1.5-pro", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Gemini API key not found. Set GEMINI_API_KEY environment variable."
            )
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(model)
        except ImportError:
            raise ImportError(
                "Google Generative AI package not installed. Run: pip install google-generativeai"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send chat messages to Gemini."""
        # Convert messages to Gemini format
        history = []
        current_prompt = ""
        
        for msg in messages:
            if msg['role'] == 'system':
                # Prepend system message to first user message
                current_prompt = msg['content'] + "\n\n"
            elif msg['role'] == 'user':
                current_prompt += msg['content']
            elif msg['role'] == 'assistant':
                history.append({
                    'role': 'user',
                    'parts': [current_prompt]
                })
                history.append({
                    'role': 'model',
                    'parts': [msg['content']]
                })
                current_prompt = ""
        
        # Start chat with history
        chat = self.client.start_chat(history=history[:-1] if history else [])
        
        # Generate response
        response = chat.send_message(
            current_prompt,
            generation_config={'temperature': temperature, 'max_output_tokens': max_tokens or 8192}
        )
        
        return response.text
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze job description using Gemini."""
        prompt = f"""Analyze this job description and extract:
1. Key requirements (must-have vs. nice-to-have)
2. Required skills and technologies
3. Domain focus (data science, biostatistics, ML engineering, etc.)
4. Role level (IC, senior IC, staff, principal, leadership)
5. Company culture indicators
6. Top 10 keywords for ATS optimization

Job Description:
{job_text}

Return as JSON with these fields:
- title: str
- company: str (if mentioned)
- domain: str
- role_level: str
- required_skills: List[str]
- preferred_skills: List[str]
- must_have_requirements: List[str]
- nice_to_have_requirements: List[str]
- culture_indicators: List[str]
- ats_keywords: List[str]
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at analyzing job descriptions for CV optimization."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.3)
        
        # Parse JSON response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise
    
    def recommend_customizations(
        self,
        job_analysis: Dict,
        master_data: Dict,
        user_preferences: Dict = None,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """Get LLM recommendations for customization."""
        prompt = f"""Based on this job analysis and candidate's master CV data, recommend:
1. Which experiences to emphasize (list IDs and reasons)
2. Which skills to highlight
3. Which achievements to feature
4. Professional summary focus
5. Suggested content reordering

Job Analysis:
{json.dumps(job_analysis, indent=2)}

Candidate Data Summary:
- {len(master_data.get('experience', []))} experiences
- {len(master_data.get('skills', {}))} skill categories
- {len(master_data.get('selected_achievements', []))} key achievements

Available Experience IDs: {', '.join([exp.get('id', '') for exp in master_data.get('experience', [])])}

Return as JSON with:
- recommended_experiences: List[str] (use exact IDs from the list above, e.g., ["exp_001", "exp_005"])
- recommended_skills: List[str]
- recommended_achievements: List[str] (IDs)
- summary_focus: str
- reasoning: str
"""
        
        messages = [
            {"role": "system", "content": "You are an expert at CV optimization and content selection."},
            {"role": "user", "content": prompt}
        ]
        
        response = self.chat(messages, temperature=0.5)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse LLM response as JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            
            # Try to extract JSON from markdown code block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "```" in response:
                # Try any code block
                json_str = response.split("```")[1].split("```")[0].strip()
                # Remove language identifier if present
                if json_str.startswith('json\n'):
                    json_str = json_str[5:]
                return json.loads(json_str)
            
            # Return a default response structure
            print("Warning: Returning default recommendations")
            return {
                "recommended_experiences": [],
                "recommended_skills": [],
                "recommended_achievements": [],
                "summary_focus": "general",
                "reasoning": "Failed to parse LLM response"
            }
    
    def semantic_match(
        self,
        content: str,
        requirements: List[str]
    ) -> float:
        """Calculate semantic similarity using Gemini."""
        # Gemini doesn't have a native embeddings API yet, use prompting
        prompt = f"""Rate how well this content matches these requirements on a scale of 0.0 to 1.0.
Only return the numeric score.

Content: {content[:500]}

Requirements: {', '.join(requirements[:10])}

Score (0.0-1.0):"""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, temperature=0.1)
        
        try:
            return float(response.strip())
        except ValueError:
            return 0.5  # Default middle score


class LocalLLMClient(LLMClient):
    """Anthropic Claude client."""
    
    def __init__(self, model: str = "claude-3-opus-20240229", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable."
            )
        
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "Anthropic package not installed. Run: pip install anthropic"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Send messages to Claude."""
        # Convert messages format
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
        user_messages = [m for m in messages if m["role"] != "system"]
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system_msg,
            messages=user_messages
        )
        
        return response.content[0].text
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using Claude (similar to OpenAI implementation)."""
        # Implementation similar to OpenAI but using Claude's format
        # ... (similar logic)
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Dict = None, conversation_history: List[Dict] = None) -> Dict:
        """Get recommendations from Claude."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using Claude."""
        # Claude doesn't have native embeddings API, use prompting
        pass


class LocalLLMClient(LLMClient):
    """Local LLM using transformers."""
    
    def __init__(self, model: str = "mistralai/Mistral-7B-Instruct-v0.2"):
        self.model_name = model
        
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch
            
            self.tokenizer = AutoTokenizer.from_pretrained(model)
            self.model = AutoModelForCausalLM.from_pretrained(
                model,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto"
            )
        except ImportError:
            raise ImportError(
                "Transformers not installed. Run: pip install transformers torch"
            )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate response using local model."""
        # Format messages for instruction-following
        prompt = self._format_messages(messages)
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_tokens or 512,
            temperature=temperature,
            do_sample=True
        )
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Extract just the response part
        response = response.split(prompt)[-1].strip()
        
        return response
    
    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        """Format messages for instruction model."""
        formatted = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                formatted.append(f"System: {content}")
            elif role == "user":
                formatted.append(f"User: {content}")
            elif role == "assistant":
                formatted.append(f"Assistant: {content}")
        formatted.append("Assistant: ")
        return "\n\n".join(formatted)
    
    def analyze_job_description(self, job_text: str, master_data: Dict) -> Dict:
        """Analyze using local model."""
        # Similar to OpenAI but may need simpler prompts
        pass
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict, user_preferences: Dict = None, conversation_history: List[Dict] = None) -> Dict:
        """Get recommendations from local model."""
        pass
    
    def semantic_match(self, content: str, requirements: List[str]) -> float:
        """Semantic matching using local embeddings."""
        # Use sentence-transformers for embeddings
        try:
            from sentence_transformers import SentenceTransformer, util
            
            if not hasattr(self, 'embed_model'):
                self.embed_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            content_emb = self.embed_model.encode(content, convert_to_tensor=True)
            req_emb = self.embed_model.encode(" ".join(requirements), convert_to_tensor=True)
            
            similarity = util.cos_sim(content_emb, req_emb)
            return float(similarity[0][0])
        except ImportError:
            return self._fallback_match(content, requirements)
    
    def _fallback_match(self, content: str, requirements: List[str]) -> float:
        """Simple keyword matching fallback."""
        content_lower = content.lower()
        matches = sum(1 for req in requirements if req.lower() in content_lower)
        return matches / len(requirements) if requirements else 0.0


class GroqClient(OpenAIClient):
    """Groq client - uses OpenAI-compatible API for fast inference."""
    
    def __init__(self, model: str = "llama-3.3-70b-versatile", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Groq API key not found. Set GROQ_API_KEY environment variable or "
                "pass api_key parameter. Get a free key from: https://console.groq.com/"
            )
        
        try:
            from openai import OpenAI
            # Use Groq's API endpoint (OpenAI-compatible)
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )


class GitHubModelsClient(OpenAIClient):
    """GitHub Models client - uses OpenAI-compatible API with GitHub token."""
    
    def __init__(self, model: str = "gpt-4o", api_key: Optional[str] = None):
        # GitHub Models uses the same API format as OpenAI
        self.model = model
        self.api_key = api_key or os.getenv("GITHUB_MODELS_TOKEN")
        
        if not self.api_key:
            raise ValueError(
                "GitHub Models token not found. Set GITHUB_MODELS_TOKEN environment variable or "
                "pass api_key parameter. Get a token from: https://github.com/settings/tokens"
            )
        
        try:
            from openai import OpenAI
            # Use GitHub's API endpoint
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://models.inference.ai.azure.com"
            )
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. Run: pip install openai"
            )


def get_llm_provider(
    provider: str = "github",
    model: Optional[str] = None,
    api_key: Optional[str] = None
) -> LLMClient:
    """Factory function to get LLM client."""
    
    if provider == "github":
        return GitHubModelsClient(
            model=model or "gpt-4o",
            api_key=api_key
        )
    elif provider == "openai":
        return OpenAIClient(
            model=model or "gpt-4-turbo-preview",
            api_key=api_key
        )
    elif provider == "anthropic":
        return AnthropicClient(
            model=model or "claude-3-opus-20240229",
            api_key=api_key
        )
    elif provider == "gemini":
        return GeminiClient(
            model=model or "gemini-1.5-pro",
            api_key=api_key
        )
    elif provider == "groq":
        return GroqClient(
            model=model or "llama-3.3-70b-versatile",
            api_key=api_key
        )
    elif provider == "local":
        return LocalLLMClient(
            model=model or "mistralai/Mistral-7B-Instruct-v0.2"
        )
    else:
        raise ValueError(f"Unknown provider: {provider}. Choose from: github, openai, anthropic, gemini, groq, local")
