"""
LLM Client abstraction for different providers.

Supports:
- OpenAI (GPT-4, etc.)
- Anthropic (Claude)
- Local models via transformers
- GitHub Copilot (if available)
"""

import os
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
        master_data: Dict
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
        import json
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
        master_data: Dict
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

Return as JSON with:
- recommended_experiences: List[str] (IDs)
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
        
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise
    
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
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict) -> Dict:
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
    
    def recommend_customizations(self, job_analysis: Dict, master_data: Dict) -> Dict:
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
    elif provider == "local":
        return LocalLLMClient(
            model=model or "mistralai/Mistral-7B-Instruct-v0.2"
        )
    else:
        raise ValueError(f"Unknown provider: {provider}. Choose from: github, openai, anthropic, local")
