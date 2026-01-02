interface PromotionModalProps {
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
}

const PROMOTION_PIECES = [
  { piece: "q" as const, symbol: "♛", name: "Queen" },
  { piece: "r" as const, symbol: "♜", name: "Rook" },
  { piece: "b" as const, symbol: "♝", name: "Bishop" },
  { piece: "n" as const, symbol: "♞", name: "Knight" },
];

export default function PromotionModal({ onSelect }: PromotionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <p className="text-center text-lg font-medium mb-4">Choose promotion piece</p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map(({ piece, symbol, name }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="w-16 h-16 text-5xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title={name}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
