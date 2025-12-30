import random

from .chess_service import ChessService


class RandomAI:
    def select_move(self, chess_service: ChessService) -> str | None:
        legal_moves = chess_service.get_legal_moves()
        if not legal_moves:
            return None
        return random.choice(legal_moves)
