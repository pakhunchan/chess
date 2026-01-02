import chess
import chess.engine

# Map difficulty level (1-6) to Stockfish Skill Level (0-20)
DIFFICULTY_TO_SKILL = {
    1: 1,   # Beginner (~800 ELO)
    2: 5,   # Easy (~1200 ELO)
    3: 10,  # Medium (~1600 ELO)
    4: 15,  # Hard (~2000 ELO)
    5: 18,  # Expert (~2500 ELO)
    6: 20,  # Maximum (~3500+ ELO)
}

STOCKFISH_PATH = "/usr/games/stockfish"


class StockfishAI:
    def select_move(self, fen: str, difficulty: int = 3) -> str | None:
        skill_level = DIFFICULTY_TO_SKILL.get(difficulty, 10)

        try:
            with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
                engine.configure({
                    "Skill Level": skill_level,
                    "Hash": 16,      # Limit hash table to 16 MB (default is 16, but be explicit)
                    "Threads": 1,    # Single thread to reduce memory usage
                })

                board = chess.Board(fen)
                if board.is_game_over():
                    return None

                # Use a short time limit - skill level controls strength
                result = engine.play(board, chess.engine.Limit(time=0.1))
                return result.move.uci() if result.move else None
        except Exception as e:
            print(f"Stockfish error: {e}")
            return None
