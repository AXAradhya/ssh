import os
import json
from typing import Dict, Any
from google import genai

class GridNLPParser:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def build_omni_context(self, live_data: Dict[str, Any] = None) -> str:
        """Aggregates all system state into a massive LLM context string."""
        if not live_data:
             live_data = {
                "Load": "850.5 MW", "Capacity": "1150 MW", "Solar": "145.2 MW", "Wind": "80.1 MW", "Risk Score": "12/100"
            }
        
        # We simulate the omni-gathering by joining the provided live_data dict and adding the ML structural statuses.
        # In a fully wired production state, this would call all singleton methods directly.
        context = "=== GRIDGUARD AI OMNI-CONTEXT ===\n"
        context += json.dumps(live_data, indent=2) + "\n"
        context += "--- Advanced ML Subsystems Status ---\n"
        context += "IDS Security Radar: SCANNING. Threat Level Low. 450 req/s.\n"
        context += "Transformer Twin: K-Factor 75%. Hot-Spot 85C. Normal Aging.\n"
        context += "VPP Aggregator: 1200 EV Batteries ready. 45MW Virtual Capacity.\n"
        context += "Market Bidding AI: Holding. Expected price drop in 2 hours.\n"
        context += "Drone Fleet: 3 Flights scheduled for tomorrow targeting high-risk turbines.\n"
        context += "PMU Monitor: Grid Frequency 60.001Hz. RoCoF stable at 0.05Hz/s.\n"
        return context

    def parse_query(self, query: str, live_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Processes the natural language query using Gemini LLM if available, else fallback."""
        
        omni_context = self.build_omni_context(live_data)
        
        system_prompt = f"""You are the GridGuard AI Copilot. You are an expert system administrator managing a massive smart energy grid. 
You must answer the user's questions based ONLY on the exact real-time data provided in the omni-context below. 
Be concise, highly technical, and confident.

{omni_context}"""

        response_dict = {
            "intent": "gen-ai",
            "confidence": 0.99,
            "answer": "",
            "data_context": {"llm_active": bool(self.client), "api_key_found": bool(self.api_key)}
        }

        if self.client:
            try:
                # Use Gemini 2.5 Flash for rapid text responses
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[system_prompt, f"User Query: {query}"]
                )
                response_dict["answer"] = response.text
            except Exception as e:
                 response_dict["answer"] = f"LLM Generation Error: {str(e)}. (Check your GEMINI_API_KEY)"
        else:
            # Fallback if no real key is loaded yet, but act like the LLM
            response_dict["answer"] = f"GEMINI API KEY MISSING. Cannot process NLP query '{query}'. However, I can confirm I have aggregated the following Omni-Context ready for the LLM:\n\n{omni_context}"

        return response_dict
