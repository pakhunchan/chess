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

        import chess
        board = chess.Board(fen)
        turn = "White" if board.turn == chess.WHITE else "Black"
        
        prompt = f"""
        You are a concise Chess Tutor.
        The current board FEN is: {fen}
        It is {turn}'s turn.
        
        The move to analyze is: {move_uci}.
        """
        
        if player_pv:
            prompt += f"Projected line: {player_pv}.\n"

        if best_move_uci and best_move_uci != move_uci:
            prompt += f"\nNote: The engine prefers {best_move_uci} (Best).\n"
            if best_pv:
                 prompt += f"Engine line: {best_pv}.\n"

        if alternative_move:
             prompt += f"\nNote: Another option is {alternative_move} (Alternative).\n"
             if alternative_pv:
                  prompt += f"Alt line: {alternative_pv}.\n"
        
        prompt += f"""
        Explain the strategic purpose of {move_uci} for {turn} in simple text.
        If there is a better move mentioned, briefly explain why {move_uci} is inferior or superior in comparison.
        
        CRITICAL INSTRUCTIONS:
        1. Response MUST be under 50 words.
        2. Do NOT mention moves that belong to the opponent as if the user is playing them.
        3. Do NOT use markdown.
        4. Focus on ONE key idea (e.g. controlling center, safety, tactics).
        """

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            error_str = str(e)
            print(f"Gemini API Error: {error_str}")
            if "429" in error_str:
                return "📉 Usage limit reached. Please wait a minute before asking again."
            return "I couldn't generate an explanation right now."

tutor_service = TutorService()
