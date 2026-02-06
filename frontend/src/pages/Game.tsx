import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import ChessBoard from "@/components/chess/ChessBoard";
import PromotionModal from "@/components/chess/PromotionModal";
import { getGame, makeMove, type GameResponse, DIFFICULTY_LABELS } from "@/lib/api";
import { usePremove } from "@/hooks/usePremove";
import { TutorCard } from "@/components/tutor/TutorCard";
import { PlayerInfo } from "@/components/chess/PlayerInfo";
import { useAuth } from "@/contexts/AuthContext";

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [previewFen, setPreviewFen] = useState<string | null>(null);

  // Game State
  const [game, setGame] = useState<GameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    onMoveError: () => {
      setGame((prev) =>
        prev
          ? {
            ...prev,
            current_position: game?.current_position || prev.current_position, // Revert?
            turn: "white",
          }
          : null
      );
    }
  });

  const handleMove = async (from: string, to: string, promotion?: string) => {
    console.log("handleMove called:", { from, to, promotion, turn: game?.turn, gameStatus: game?.status });
    if (!gameId || !game || game.status === "finished") return false;

    // --- Premove Queueing Logic (Opponent's Turn) ---
    if (game.turn === "black") {
      const added = addPremove(from, to, promotion);
      return added;
    }

    // --- Regular Move Logic (My Turn) ---

    // Validate move locally using chess.js
    const chess = new Chess(game.current_position);
    try {
      chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
    } catch (e) {
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

  // Animation State
  const previewInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePreviewHover = useCallback((pv: string | null) => {
    // Clear any existing animation
    if (previewInterval.current) {
      clearInterval(previewInterval.current);
      previewInterval.current = null;
    }

    if (!pv || !game) {
      setPreviewFen(null);
      return;
    }

    try {
      const moves = pv.split(" ");
      const tempChess = new Chess(game.current_position);
      let moveIndex = 0;

      // Show first move immediately
      if (moves.length > 0) {
        tempChess.move(moves[0]);
        setPreviewFen(tempChess.fen());
        moveIndex++;
      }

      // Animate subsequent moves every 2000ms
      previewInterval.current = setInterval(() => {
        if (moveIndex >= moves.length) {
          // Reset to start of PV or stop? Let's reset to start to loop
          tempChess.load(game.current_position);
          moveIndex = 0;

          // Optional: Pause before restarting? For now, immediate loop
          if (moves.length > 0) {
            tempChess.move(moves[0]);
            setPreviewFen(tempChess.fen());
            moveIndex++;
          }
        } else {
          // Play next move
          try {
            tempChess.move(moves[moveIndex]);
            setPreviewFen(tempChess.fen());
            moveIndex++;
          } catch (e) {
            console.error("Invalid preview move:", moves[moveIndex]);
            if (previewInterval.current) clearInterval(previewInterval.current);
          }
        }
      }, 2000);

    } catch (e) {
      console.error("Preview setup failed:", e);
    }
  }, [game]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewInterval.current) clearInterval(previewInterval.current);
    };
  }, []);

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



  // Determine what position to show on the board
  // Priority: 1. Flashback Preview 2. Premove Preview 3. Game Position
  const displayPosition = previewFen || ((premoveQueue.length > 0 && previewPosition)
    ? previewPosition
    : game.current_position);

  const isPreviewing = previewFen !== null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-start p-4 text-white relative">

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
          Leave Game
        </Button>
      </div>

      <div className="w-full max-w-full flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center h-full px-4">

        {/* Board Area: Flex-1 to take available width, formatted to stay square */}
        <div className="flex-1 flex flex-col justify-center items-center h-full max-h-[95vh]">

          {/* Opponent Info */}
          <div className="w-full max-w-[70vh]">
            <PlayerInfo
              name={`Computer (${DIFFICULTY_LABELS[game.difficulty] || "Medium"})`}
              fen={displayPosition}
              orientation="black"
              isOpponent
            />
          </div>

          {/* Board Container - Resized */}
          <div className={`h-[70vh] aspect-square max-w-full relative z-10 transition-all duration-500 my-2 ${isPreviewing ? 'brightness-105 saturate-[60%] sepia-[15%] blur-[0.25px]' : ''}`}>
            {game && (
              <ChessBoard
                position={displayPosition}
                onMove={handleMove}
                onPromotionNeeded={handlePromotionNeeded}
                disabled={game.status === "finished" || isPreviewing}
                highlightSquares={lastMove}
                premoveQueue={premoveQueue}
                onPremoveCancel={cancelPremoves}
              />
            )}
          </div>

          {/* Player Info */}
          <div className="w-full max-w-[70vh]">
            <PlayerInfo
              name={user?.displayName || "Guest"}
              fen={displayPosition}
              orientation="white"
              showScore={true}
            />
          </div>
        </div>

        {/* Right Col: Info & Tutor - Fixed Width on Desktop */}
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 pt-0">
          {/* AI Tutor */}
          {game && (
            <TutorCard
              fen={game.current_position} // Always show analysis for REAL position
              onSelectMove={(move) => handleMove(move.from, move.to)}
              orientation="white"
              onPreviewHover={handlePreviewHover}
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
