import { Chessboard } from "react-chessboard";
import { useMemo } from "react";

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string, promotion?: string) => boolean | Promise<boolean>;
  onPromotionNeeded?: (from: string, to: string) => void;
  disabled?: boolean;
  highlightSquares?: { from: string; to: string } | null;
  premoveQueue?: { from: string; to: string }[];
  onPremoveCancel?: () => void;
}

interface PieceDropArgs {
  piece: {
    pieceType: string;
  };
  sourceSquare: string;
  targetSquare: string | null;
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
  const handlePieceDrop = (arg1: any, arg2?: any, arg3?: any): boolean => {
    console.log("handlePieceDrop called with:", arg1, arg2, arg3);
    let sourceSquare: string;
    let targetSquare: string;
    let piece: any;

    // Detect if arg1 is an object (Legacy/Options signature?)
    if (typeof arg1 === 'object' && arg1.sourceSquare && arg1.targetSquare) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
      piece = arg1.piece;
    } else {
      // Standard positional signature
      sourceSquare = arg1;
      targetSquare = arg2;
      piece = arg3;
    }
    console.log("Parsed drop:", { sourceSquare, targetSquare, piece });

    if (!targetSquare) return false;

    // Normalize piece string
    const pieceStr = typeof piece === 'string' ? piece : piece?.pieceType || "";

    const isPromotion =
      pieceStr[1] === "P" &&
      ((pieceStr[0] === "w" && targetSquare[1] === "8") ||
        (pieceStr[0] === "b" && targetSquare[1] === "1"));

    if (isPromotion && onPromotionNeeded) {
      onPromotionNeeded(sourceSquare, targetSquare);
      return false;
    }

    const result = onMove(sourceSquare, targetSquare);

    if (result instanceof Promise) {
      result.catch(console.error);
      return true;
    }

    return result;
  };

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Standard last move highlight (Yellow)
    if (highlightSquares) {
      styles[highlightSquares.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      styles[highlightSquares.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }

    // Premove highlights (Red)
    premoveQueue.forEach((move, index) => {
      // Opacity increases with queue depth, maxing out at 0.6
      const opacity = Math.min(0.2 + index * 0.1, 0.6);
      const color = `rgba(235, 97, 80, ${opacity})`;

      styles[move.from] = { backgroundColor: color };
      styles[move.to] = { backgroundColor: color };
    });

    return styles;
  }, [highlightSquares, premoveQueue]);

  return (
    <div
      className="w-full max-w-[600px]"
      onContextMenu={(e) => {
        e.preventDefault();
        onPremoveCancel?.();
      }}
    >
      <Chessboard
        options={{
          position,
          onPieceDrop: handlePieceDrop,
          arePiecesDraggable: !disabled,
          boardOrientation: "white",
          squareStyles, // Note: The prop is likely squareStyles in this version if it follows v4 pattern, or customSquareStyles?
          // Given it uses 'options', it likely mirrors standard props inside.
          // The User's previous code used 'squareStyles'. I will stick to that.
          boardWidth: 600,
        }}
      />
    </div>
  );
}
