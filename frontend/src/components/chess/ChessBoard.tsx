import { Chessboard } from "react-chessboard";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string, promotion?: string) => boolean | Promise<boolean>;
  onPromotionNeeded?: (from: string, to: string) => void;
  disabled?: boolean;
  highlightSquares?: { from: string; to: string } | null;
  premoveQueue?: { from: string; to: string }[];
  onPremoveCancel?: () => void;
}

export default function ChessBoard({
  position,
  onMove,
  onPromotionNeeded,
  disabled,
  highlightSquares,
  premoveQueue = [],
  onPremoveCancel
}: ChessBoardProps) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  function getMoveOptions(square: string) {
    const chess = new Chess(position);
    const moves = chess.moves({
      square,
      verbose: true,
    });


    // If no moves found, check if we can force a turn (for premoves)
    if (moves.length === 0 && !disabled) {
      // Force White Turn Logic (Simple localized version)
      // We assume the user is always White in this context based on 'boardOrientation="white"'
      const tokens = position.split(" ");
      if (tokens[1] === "b") {
        tokens[1] = "w";
        tokens[3] = "-"; // Clear en passant to avoid invalid FEN if inconsistent
        const forcedFen = tokens.join(" ");
        try {
          const forcedMoves = new Chess(forcedFen).moves({
            square,
            verbose: true
          });
          return forcedMoves;
        } catch (e) {
          console.error("Forced move calc error:", e);
          return [];
        }
      }
    }
    return moves;
  }

  function onSquareClick(args: any) { // actually SquareHandlerArgs or string depending on version, safely handle both
    const square = typeof args === 'string' ? args : args.square;

    setOptionSquares({});

    // 1. Unselect if clicking same square
    if (moveFrom === square) {
      setMoveFrom(null);
      return;
    }

    // 2. If we have a pending source, check if this is a valid move target
    if (moveFrom) {
      // Get valid moves from source
      const moves = getMoveOptions(moveFrom);
      const foundMove = moves.find((m: any) => m.from === moveFrom && m.to === square);

      // If valid move found
      if (foundMove) {
        // Check for promotion
        const isPromotion = foundMove.flags.includes("p") || foundMove.promotion; // chess.js flag 'p' OR manual check
        // Simple visual chcek for pawn reaching rank 1/8
        // But strict structured check:
        if ((foundMove.piece === "p" && (foundMove.to[1] === "8" || foundMove.to[1] === "1"))) {
          onPromotionNeeded?.(moveFrom, square);
          setMoveFrom(null);
          return;
        }

        const result = onMove(moveFrom, square, foundMove.promotion);
        setMoveFrom(null);
        return;
      }
    }

    // 3. Select new piece (if it has moves)
    const newMoves = getMoveOptions(square);
    if (newMoves.length === 0) {
      setMoveFrom(null);
      return;
    }

    setMoveFrom(square);

    // Highlight options
    const newOptions: Record<string, React.CSSProperties> = {};
    newMoves.forEach((move: any) => {
      newOptions[move.to] = {
        background:
          new Chess(position).get(move.to) && new Chess(position).get(move.to).color !== new Chess(position).get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    // Highlight source
    newOptions[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newOptions);
  }

  const handlePieceDrop = (arg1: any, arg2?: any, arg3?: any): boolean => {
    let sourceSquare: string;
    let targetSquare: string;
    let piece: any;

    if (typeof arg1 === 'object' && arg1.sourceSquare && arg1.targetSquare) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
      piece = arg1.piece;
    } else {
      sourceSquare = arg1;
      targetSquare = arg2;
      piece = arg3;
    }

    if (!targetSquare) return false;

    // Normalization
    const pieceStr = typeof piece === 'string' ? piece : piece?.pieceType || "";

    // Promotion check (Drag Logic)
    const isPromotion =
      pieceStr[1] === "P" &&
      ((pieceStr[0] === "w" && targetSquare[1] === "8") ||
        (pieceStr[0] === "b" && targetSquare[1] === "1"));

    if (isPromotion && onPromotionNeeded) {
      onPromotionNeeded(sourceSquare, targetSquare);
      // Clean up click state if any
      setMoveFrom(null);
      setOptionSquares({});
      return false;
    }

    const result = onMove(sourceSquare, targetSquare);

    // Clean up click state logic
    setMoveFrom(null);
    setOptionSquares({});

    if (result instanceof Promise) {
      result.catch(console.error);
      return true;
    }

    return result;
  };

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {
      ...optionSquares // Merge click options
    };

    // Standard last move highlight (Yellow) if not overridden
    if (highlightSquares) {
      styles[highlightSquares.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)", ...styles[highlightSquares.from] };
      styles[highlightSquares.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)", ...styles[highlightSquares.to] };
    }

    // Premove highlights (Red) - Highest priority?
    premoveQueue.forEach((move, index) => {
      const opacity = Math.min(0.2 + index * 0.1, 0.6);
      const color = `rgba(235, 97, 80, ${opacity})`;

      styles[move.from] = { backgroundColor: color, ...styles[move.from] };
      styles[move.to] = { backgroundColor: color, ...styles[move.to] };
    });

    return styles;
  }, [highlightSquares, premoveQueue, optionSquares]);

  return (
    <div
      className="w-full max-w-[600px] overflow-hidden rounded-md shadow-xl bg-neutral-900 leading-none text-[0px]"
      onContextMenu={(e) => {
        e.preventDefault();
        onPremoveCancel?.();
        setMoveFrom(null);
        setOptionSquares({});
      }}
    >
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <Chessboard
          options={{
            position,
            onPieceDrop: handlePieceDrop,
            onSquareClick: onSquareClick,
            arePiecesDraggable: !disabled,
            boardOrientation: "white",
            squareStyles,
            boardWidth: 600,
          }}
        />
      </div>
    </div>
  );
}
