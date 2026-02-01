import os
import google.generativeai as genai
from .chess_service import ChessService

class TutorService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables.")
        else:
            import google.generativeai as genai
            print(f"Using google-generativeai version: {genai.__version__}")
            genai.configure(api_key=api_key)
            # 2026 Update: gemini-1.5 is deprecated. Using Gemini 3.
            self.model = genai.GenerativeModel('gemini-3-flash-preview')

    async def explain_move(self, fen: str, move_uci: str, best_move_uci: str | None = None, player_pv: str | None = None, best_pv: str | None = None, alternative_move: str | None = None, alternative_pv: str | None = None) -> str:
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
        
        if player_pv:
            prompt += f"The projected continuation for this move is: {player_pv}.\n"

        if best_move_uci and best_move_uci != move_uci:
            prompt += f"\nHowever, the engine recommends: {best_move_uci} (Best Move).\n"
            if best_pv:
                 prompt += f"The engine foresees the line: {best_pv}.\n"

        if alternative_move:
             prompt += f"\nAnother strong option is: {alternative_move} (Alternative).\n"
             if alternative_pv:
                  prompt += f"Line: {alternative_pv}.\n"
        
        prompt += """
        Explain the strategic purpose of the best move (and the alternative if provided) in 2-3 concise sentences.
        Briefly compare why the Best Move is preferred over the Alternative (or the user's move).
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
