import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChessBoard from "@/components/chess/ChessBoard";
import { getGame, makeMove, DIFFICULTY_LABELS, type GameResponse } from "@/lib/api";

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    getGame(gameId)
      .then(setGame)
      .catch((err) => setError(err.message));
  }, [gameId]);

  const handleMove = async (from: string, to: string, promotion?: string) => {
    if (!gameId || !game || game.status === "finished") return false;

    setMoveError(null);
    const move = promotion ? `${from}${to}${promotion}` : `${from}${to}`;

    try {
      const result = await makeMove(gameId, move);
      setGame((prev) =>
        prev
          ? {
              ...prev,
              current_position: result.current_position,
              status: result.status,
              turn: result.turn,
              result: result.result,
            }
          : null
      );
      return true;
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Invalid move");
      return false;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getStatusText = () => {
    if (game.status === "finished") {
      if (game.result === "white_win") return "You win!";
      if (game.result === "black_win") return "Computer wins!";
      return "Draw!";
    }
    return game.turn === "white" ? "Your turn" : "Computer thinking...";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8 gap-6">
      <div className="flex items-center justify-between w-full max-w-[600px]">
        <Button variant="ghost" onClick={() => navigate("/")}>
          ← Back
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Chess</h1>
          <p className="text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[game.difficulty]}
          </p>
        </div>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      <div className="text-center">
        <p className="text-lg font-medium">{getStatusText()}</p>
        {moveError && <p className="text-destructive text-sm mt-1">{moveError}</p>}
      </div>

      <ChessBoard
        position={game.current_position}
        onMove={handleMove}
        disabled={game.status === "finished" || game.turn === "black"}
      />

      {game.status === "finished" && (
        <Button onClick={() => navigate("/")}>New Game</Button>
      )}
    </div>
  );
}
