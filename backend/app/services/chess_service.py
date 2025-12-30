import chess

STARTING_FEN = chess.STARTING_FEN


class ChessService:
    def __init__(self, fen: str = STARTING_FEN):
        self.board = chess.Board(fen)

    @property
    def fen(self) -> str:
        return self.board.fen()

    @property
    def turn(self) -> str:
        return "white" if self.board.turn == chess.WHITE else "black"

    def is_legal_move(self, move_uci: str) -> bool:
        try:
            move = chess.Move.from_uci(move_uci)
            return move in self.board.legal_moves
        except ValueError:
            return False

    def make_move(self, move_uci: str) -> str:
        move = chess.Move.from_uci(move_uci)
        san = self.board.san(move)
        self.board.push(move)
        return san

    def get_legal_moves(self) -> list[str]:
        return [move.uci() for move in self.board.legal_moves]

    def is_game_over(self) -> bool:
        return self.board.is_game_over()

    def get_result(self) -> str | None:
        if not self.board.is_game_over():
            return None

        if self.board.is_checkmate():
            return "black_win" if self.board.turn == chess.WHITE else "white_win"

        return "draw"

    def is_check(self) -> bool:
        return self.board.is_check()
