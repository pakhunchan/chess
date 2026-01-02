interface CapturedPiecesColumnProps {
  pieces: string[];
  color: "light" | "dark";
}

const STARTING_PIECES = {
  white: { p: 8, n: 2, b: 2, r: 2, q: 1 },
  black: { p: 8, n: 2, b: 2, r: 2, q: 1 },
};

const PIECE_SYMBOLS: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

function countPieces(fen: string) {
  const boardPart = fen.split(" ")[0];
  const white = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const black = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const char of boardPart) {
    const lower = char.toLowerCase();
    if (lower in white) {
      if (char === lower) {
        black[lower as keyof typeof black]++;
      } else {
        white[lower as keyof typeof white]++;
      }
    }
  }

  return { white, black };
}

export function getCapturedPieces(fen: string) {
  const current = countPieces(fen);

  const capturedWhite: string[] = [];
  const capturedBlack: string[] = [];

  for (const piece of ["q", "r", "b", "n", "p"] as const) {
    const whiteLost = STARTING_PIECES.white[piece] - current.white[piece];
    const blackLost = STARTING_PIECES.black[piece] - current.black[piece];

    for (let i = 0; i < whiteLost; i++) {
      capturedWhite.push(piece);
    }
    for (let i = 0; i < blackLost; i++) {
      capturedBlack.push(piece);
    }
  }

  return { capturedWhite, capturedBlack };
}

export function getPlayerNetScore(fen: string): number {
  const { capturedWhite, capturedBlack } = getCapturedPieces(fen);

  const playerScore = capturedBlack.reduce((sum, p) => sum + PIECE_VALUES[p], 0);
  const opponentScore = capturedWhite.reduce((sum, p) => sum + PIECE_VALUES[p], 0);

  return playerScore - opponentScore;
}

export function CapturedPiecesColumn({ pieces, color }: CapturedPiecesColumnProps) {
  return (
    <div
      className={`flex flex-col flex-wrap content-start gap-1 text-4xl w-16 max-h-[600px] ${
        color === "dark" ? "text-gray-800" : "text-gray-300"
      }`}
    >
      {pieces.map((piece, i) => (
        <span key={i}>{PIECE_SYMBOLS[piece]}</span>
      ))}
    </div>
  );
}
