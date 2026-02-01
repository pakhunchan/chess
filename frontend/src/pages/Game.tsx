import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess, type Move as ChessMove } from "chess.js";
import { Button } from "@/components/ui/button";
import ChessBoard from "@/components/chess/ChessBoard";
import PromotionModal from "@/components/chess/PromotionModal";
import { getGame, makeMove, type GameResponse } from "@/lib/api";
import { usePremove } from "@/hooks/usePremove";
import { TutorCard } from "@/components/tutor/TutorCard";

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

  const { premoveQueue, previewPosition, addPremove, cancelPremoves } = usePremove({
    game,
    gameId,
    onMoveSuccess: (result) => {
      // Keep last move updated based on response
      const computerMove = result.last_moves[result.last_moves.length - 1];
      if (computerMove && computerMove.length >= 4) {
        setLastMove({
          from: computerMove.slice(0, 2),
          to: computerMove.slice(2, 4),
        });
      }
      // Merge result
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
    },
    onMoveError: (err) => {
      setGame((prev) =>
        prev
          ? {
            ...prev,
            current_position: game?.current_position || prev.current_position, // Revert?
            turn: "white",
          }
          : null
      );
      setMoveError(err);
    }
  });

  const handleMove = async (from: string, to: string, promotion?: string) => {
    console.log("handleMove called:", { from, to, promotion, turn: game?.turn, gameStatus: game?.status });
    if (!gameId || !game || game.status === "finished") return false;

    setMoveError(null);

    // --- Premove Queueing Logic (Opponent's Turn) ---
    if (game.turn === "black") {
      const added = addPremove(from, to, promotion);
      return added;
    }

    // --- Regular Move Logic (My Turn) ---

    // Validate move locally using chess.js
    const chess = new Chess(game.current_position);
    let moveResult: ChessMove;
    try {
      moveResult = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
    } catch (e) {
      setMoveError("Invalid move");
      return false;
    }

    // Immediately update board with player's move
    const positionAfterPlayerMove = chess.fen();
    setLastMove({ from, to });

    // Clear preview/queue (should be empty but just in case)
    cancelPremoves();

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
    // Show Premove Status
    if (premoveQueue.length > 0) {
      return `Premoves queued: ${premoveQueue.length}`;
    }
    return game.turn === "white" ? "Your turn" : "Computer thinking...";
  };

  // Determine what position to show on the board
  const displayPosition = (premoveQueue.length > 0 && previewPosition)
    ? previewPosition
    : game.current_position;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-start p-4 text-white relative">

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
          Leave Game
        </Button>
      </div>

      <div className="w-full max-w-[95%] grid grid-cols-1 lg:grid-cols-3 gap-4 items-start h-full">

        {/* Left Col: Board (92vh) */}
        <div className="lg:col-span-2 flex justify-center items-center h-[92vh]">
          <div className="w-full h-full max-w-[92vh] aspect-square">
            {game && (
              <ChessBoard
                position={displayPosition}
                onMove={handleMove}
                onPromotionNeeded={handlePromotionNeeded}
                disabled={game.status === "finished"}
                highlightSquares={lastMove}
                premoveQueue={premoveQueue}
                onPremoveCancel={cancelPremoves}
              />
            )}
          </div>
        </div>

        {/* Right Col: Info & Tutor */}
        <div className="space-y-6 pt-12 lg:pt-0">
          {/* AI Tutor */}
          {game && (
            <TutorCard
              fen={displayPosition}
              onSelectMove={(move) => handleMove(move.from, move.to)}
              orientation="white"
            />
          )}

          {/* New Game Button (Only when finished) */}
          {game && game.status === "finished" && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate("/")}>New Game</Button>
            </div>
          )}
        </div>
      </div>

      {pendingPromotion && (
        <PromotionModal onSelect={handlePromotionSelect} />
      )}
    </div>
  );
}
