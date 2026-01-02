import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import ChessBoard from "@/components/chess/ChessBoard";
import PromotionModal from "@/components/chess/PromotionModal";
import { getCapturedPieces, getPlayerNetScore, CapturedPiecesColumn } from "@/components/chess/CapturedPieces";
import { getGame, makeMove, DIFFICULTY_LABELS, type GameResponse } from "@/lib/api";

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (!gameId) return;

    getGame(gameId)
      .then(setGame)
      .catch((err) => setError(err.message));
  }, [gameId]);

  const handleMove = async (from: string, to: string, promotion?: string) => {
    if (!gameId || !game || game.status === "finished") return false;

    setMoveError(null);

    // Validate move locally using chess.js
    const chess = new Chess(game.current_position);
    const moveResult = chess.move({
      from,
      to,
      promotion: promotion as "q" | "r" | "b" | "n" | undefined,
    });

    if (!moveResult) {
      setMoveError("Invalid move");
      return false;
    }

    // Immediately update board with player's move
    const positionAfterPlayerMove = chess.fen();
    setLastMove({ from, to });
    setGame((prev) =>
      prev
        ? {
            ...prev,
            current_position: positionAfterPlayerMove,
            turn: "black",
          }
        : null
    );

    // Call backend for computer's response
    const move = promotion ? `${from}${to}${promotion}` : `${from}${to}`;
    try {
      const result = await makeMove(gameId, move);
      // Update lastMove to computer's move (last element of last_moves)
      const computerMove = result.last_moves[result.last_moves.length - 1];
      if (computerMove && computerMove.length >= 4) {
        setLastMove({
          from: computerMove.slice(0, 2),
          to: computerMove.slice(2, 4),
        });
      }
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
      // Rollback to previous position on error
      setGame((prev) =>
        prev
          ? {
              ...prev,
              current_position: game.current_position,
              turn: "white",
            }
          : null
      );
      setMoveError(err instanceof Error ? err.message : "Invalid move");
      return false;
    }
  };

  const handlePromotionNeeded = (from: string, to: string) => {
    setPendingPromotion({ from, to });
  };

  const handlePromotionSelect = (piece: "q" | "r" | "b" | "n") => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    handleMove(from, to, piece);
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
          <h1 className="text-2xl font-bold">Computer</h1>
          <p className="text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[game.difficulty]}
          </p>
        </div>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      <div className="text-center">
        <p className="text-lg font-medium">{getStatusText()}</p>
        {moveError && <p className="text-destructive text-sm mt-1">{moveError}</p>}
        {(() => {
          const score = getPlayerNetScore(game.current_position);
          if (score === 0) return null;
          return (
            <p className={`text-sm font-medium ${score > 0 ? "text-green-600" : "text-red-500"}`}>
              {score > 0 ? `+${score}` : score}
            </p>
          );
        })()}
      </div>

      <div className="flex items-center gap-4">
        <CapturedPiecesColumn
          pieces={getCapturedPieces(game.current_position).capturedBlack}
          color="dark"
        />
        <ChessBoard
          position={game.current_position}
          onMove={handleMove}
          onPromotionNeeded={handlePromotionNeeded}
          disabled={game.status === "finished" || game.turn === "black"}
          highlightSquares={lastMove}
        />
        <CapturedPiecesColumn
          pieces={getCapturedPieces(game.current_position).capturedWhite}
          color="light"
        />
      </div>

      {game.status === "finished" && (
        <Button onClick={() => navigate("/")}>New Game</Button>
      )}

      {pendingPromotion && (
        <PromotionModal onSelect={handlePromotionSelect} />
      )}
    </div>
  );
}
