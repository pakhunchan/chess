import { useMemo } from 'react';

interface PlayerInfoProps {
    name: string;
    fen: string;
    orientation: 'white' | 'black'; // The side this player is playing
    isOpponent?: boolean;
    showScore?: boolean; // New Prop
}

const PIECE_VALUES: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
    P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0
};

export function PlayerInfo({ name, fen, orientation, isOpponent = false, showScore = false }: PlayerInfoProps) {
    // 1. Calculate Material Score & Captured Pieces
    const { materialScore, capturedPieces } = useMemo(() => {
        const rows = fen.split(' ')[0].split('/');
        const pieces = rows.join('');

        let whiteMaterial = 0;
        let blackMaterial = 0;

        // Current counts
        const currentCounts: Record<string, number> = {};

        for (const char of pieces) {
            if (/\d/.test(char)) continue; // skip empty squares
            currentCounts[char] = (currentCounts[char] || 0) + 1;

            if (char === char.toUpperCase()) {
                whiteMaterial += PIECE_VALUES[char];
            } else {
                blackMaterial += PIECE_VALUES[char];
            }
        }

        // Material Difference (relative to this player)
        // If I am White: My Score = White - Black
        // If I am Black: My Score = Black - White
        const rawDiff = orientation === 'white'
            ? whiteMaterial - blackMaterial
            : blackMaterial - whiteMaterial;

        // Captured Pieces Logic
        // Starting pieces per side: 8P, 2N, 2B, 2R, 1Q
        const startCounts: Record<string, number> = {
            p: 8, n: 2, b: 2, r: 2, q: 1,
            P: 8, N: 2, B: 2, R: 2, Q: 1
        };

        const captured: string[] = [];

        const pieceTypes = ['p', 'n', 'b', 'r', 'q'];

        pieceTypes.forEach(p => {
            // If I am White, I captured Black pieces (lowercase in FEN)
            // If I am Black, I captured White pieces (uppercase in FEN)
            const checkChar = orientation === 'white' ? p : p.toUpperCase();

            // How many did opponent start with?
            const start = startCounts[checkChar] || 0;
            // How many are left?
            const current = currentCounts[checkChar] || 0;

            const count = Math.max(0, start - current);
            for (let i = 0; i < count; i++) captured.push(checkChar);
        });

        // Sort captured: Q, R, B, N, P
        const order = 'qQrRbBnNpP';
        captured.sort((a, b) => order.indexOf(a) - order.indexOf(b));

        return {
            materialScore: rawDiff,
            capturedPieces: captured
        };
    }, [fen, orientation]);

    return (
        <div className={`flex flex-col gap-1 w-full px-4 py-2 bg-neutral-900/50 rounded-lg border border-white/5 ${isOpponent ? 'mb-2' : 'mt-2'}`}>
            <div className="flex items-center gap-3 w-full">
                {/* Avatar / Name */}
                <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 border border-neutral-700">
                    {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white/90">{name}</span>
                </div>

                {/* Score (Controlled by showScore) */}
                {showScore && materialScore !== 0 && (
                    <div className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ml-2 ${materialScore > 0
                            ? 'bg-neutral-800 text-neutral-300'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                        {materialScore > 0 ? `+${materialScore}` : materialScore}
                    </div>
                )}
            </div>

            {/* Captured Pieces - Stacked below name, offset by avatar width to align with text */}
            <div className="flex -space-x-1.5 opacity-80 pl-11 h-5">
                {capturedPieces.map((p, i) => (
                    <img
                        key={`${p}-${i}`}
                        src={getPieceUrl(p)}
                        alt={p}
                        className="w-5 h-5 object-contain drop-shadow-md"
                    />
                ))}
            </div>
        </div>
    );
}

// Helper to map FEN char to filename (assuming standard cburnett/standard set)
// wP = white pawn, bP = black pawn
function getPieceUrl(char: string): string {
    const color = char === char.toUpperCase() ? 'w' : 'b';
    const type = char.toLowerCase().toUpperCase();
    return `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/${color}${type}.svg`;
}
