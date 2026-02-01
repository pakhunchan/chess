import os
import google.generativeai as genai
from .chess_service import ChessService

class TutorService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables.")
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')

    async def explain_move(self, fen: str, move_uci: str, best_move_uci: str | None = None) -> str:
        """
        Generates a natural language explanation for a chess move using Gemini.
        """
        if not hasattr(self, 'model'):
             return "AI Tutor is not configured (Missing API Key)."

        prompt = f"""
        You are a helpful Chess Grandmaster Tutor.
        The current board FEN is: {fen}
        
        The user wants to make the move: {move_uci}.
        
        """
        
        if best_move_uci and best_move_uci != move_uci:
            prompt += f"However, the engine recommends: {best_move_uci}.\n"
        
        prompt += """
        Explain the strategic purpose of the user's move (or the engine's move if the user's move is a mistake) in 2-3 concise sentences.
        Focus on key concepts like controlling the center, developing pieces, or tactical threats.
        Do not use markdown formatting like bold or italics. Keep it simple text.
        """

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return "I couldn't generate an explanation right now."

tutor_service = TutorService()
