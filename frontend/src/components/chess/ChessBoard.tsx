import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string, promotion?: string) => boolean | Promise<boolean>;
  disabled?: boolean;
}

interface PieceDropArgs {
  piece: {
    pieceType: string;
  };
  sourceSquare: string;
  targetSquare: string | null;
}

export default function ChessBoard({ position, onMove, disabled }: ChessBoardProps) {
  const handlePieceDrop = ({
    piece,
    sourceSquare,
    targetSquare,
  }: PieceDropArgs): boolean => {
    if (!targetSquare) return false;

    // Check for pawn promotion (pieceType is like "wP" or "bP")
    const isPromotion =
      piece.pieceType[1] === "P" &&
      ((piece.pieceType[0] === "w" && targetSquare[1] === "8") ||
        (piece.pieceType[0] === "b" && targetSquare[1] === "1"));

    const promotion = isPromotion ? "q" : undefined; // Auto-promote to queen

    const result = onMove(sourceSquare, targetSquare, promotion);

    // Handle both sync and async returns
    if (result instanceof Promise) {
      result.catch(console.error);
      return true; // Optimistically allow the move, will be reverted if invalid
    }

    return result;
  };

  return (
    <div className="w-full max-w-[600px]">
      <Chessboard
        options={{
          position,
          onPieceDrop: handlePieceDrop,
          allowDragging: !disabled,
          boardOrientation: "white",
          boardStyle: {
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          },
        }}
      />
    </div>
  );
}
