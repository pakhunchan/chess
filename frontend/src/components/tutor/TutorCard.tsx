import { useEffect, useState } from 'react';
import { useStockfish, type StockfishLine } from '../../hooks/useStockfish';
import { Chess } from 'chess.js';

interface TutorCardProps {
    fen: string;
    onSelectMove?: (move: { from: string; to: string }) => void;
    orientation?: "white" | "black";
}

export function TutorCard({ fen, onSelectMove, orientation = "white" }: TutorCardProps) {
    const { isReady, lines, isAnalyzing, evaluatePosition } = useStockfish();
    const [bestMove, setBestMove] = useState<StockfishLine | null>(null);
    const [aggressiveMove, setAggressiveMove] = useState<StockfishLine | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);

    async function handleExplain() {
        if (!bestMove || !fen) return;

        setIsExplaining(true);
        try {
            // We pass the "Best Move" as the user's intended move to get an explanation of why it is good.
            // We include the PV (line) for context. We do NOT pass aggressiveMove as a 'correction' because bestMove is already the best.
            const res = await import('../../lib/api').then(m => m.explainMove(fen, bestMove.uci, undefined, bestMove.pv));
            setExplanation(res.explanation);
        } catch (e) {
            console.error(e);
        } finally {
            setIsExplaining(false);
        }
    }

    useEffect(() => {
        // Only analyze if engine is ready and FEN is valid
        if (isReady && fen) {
            // Defensive check: is FEN plausible?
            evaluatePosition(fen, 18); // Depth 18 for good quality
        }
    }, [fen, isReady, evaluatePosition]);

    // Process lines to find Best and Aggressive
    useEffect(() => {
        if (lines.length === 0 || !fen) {
            setBestMove(null);
            setAggressiveMove(null);
            return;
        }

        try {
            const chess = new Chess(fen);
            const movesDetails = lines.map(line => {
                try {
                    // Stockfish UCI is concise (e2e4). Chess.js needs explicit parsing sometimes or 'loose' mode.
                    // We simulate the move to get SAN and flags.
                    const move = chess.move({
                        from: line.uci.slice(0, 2),
                        to: line.uci.slice(2, 4),
                        promotion: line.uci.length > 4 ? line.uci.slice(4) as any : undefined
                    });
                    chess.undo(); // specific crucial step: undo to verify next line from same state

                    return {
                        ...line,
                        san: move.san,
                        flags: move.flags,
                        isCapture: move.flags.includes('c') || move.flags.includes('e'),
                        isCheck: move.san.includes('+') || move.san.includes('#')
                    };
                } catch (e) {
                    // If chess.js rejects the move (e.g. engine found a move chess.js thinks is illegal?!), fallback
                    return { ...line, san: line.uci, flags: '', isCapture: false, isCheck: false };
                }
            });

            // Best Move is simply the one with highest score (which Stockfish sorts as #0 usually, or ID 1 in logic)
            // Note: My hook sorts by ID. ID 1 is MULTIPV 1 (Best).
            const best = movesDetails.find(l => l.id === 1);

            // Aggressive: Find highest rated move that is a capture or check AND is NOT the best move
            const aggressive = movesDetails.find(l =>
                l.id !== 1 &&
                (l.isCapture || l.isCheck) &&
                (l.score > (best?.score || 0) - 100) // Don't recommend terrible blunders (within 1 pawn of best)
            );

            setBestMove(best || null);
            setAggressiveMove(aggressive || null);

        } catch (e) {
            console.error("TutorCard FEN Error:", e);
            // Fallback: don't crash, just show nothing
            setBestMove(null);
            setAggressiveMove(null);
        }

    }, [lines, fen]);

    function formatScore(score: number) {
        const evalScore = (score / 100).toFixed(2);
        return score > 0 ? `+${evalScore}` : evalScore;
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-yellow-500">⚡</span> AI Tutor
                </h2>
                <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                    {isAnalyzing ? "Analyzing..." : `Depth ${lines[0]?.depth || 0}`}
                </div>
            </div>

            <div className="space-y-3">
                {/* Best Move Card */}
                {bestMove && (
                    <div
                        className="group relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border border-emerald-500/30 rounded-lg p-4 cursor-pointer hover:border-emerald-400/50 transition-all"
                        onClick={() => onSelectMove?.({ from: bestMove.uci.slice(0, 2), to: bestMove.uci.slice(2, 4) })}
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg width="60" height="60" fill="currentColor" className="text-emerald-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Best Overall</span>
                                <span className="text-emerald-300 font-mono text-sm">{formatScore(bestMove.score)}</span>
                            </div>
                            <div className="text-3xl font-black text-white mb-2">{bestMove.san}</div>
                            <div className="text-emerald-200/60 text-xs truncate font-mono">
                                {bestMove.pv}
                            </div>
                        </div>
                    </div>
                )}

                {/* Aggressive Alternative (if exists and different) */}
                {aggressiveMove && (
                    <div
                        className="group relative overflow-hidden bg-gradient-to-br from-rose-900/40 to-rose-900/10 border border-rose-500/30 rounded-lg p-4 cursor-pointer hover:border-rose-400/50 transition-all"
                        onClick={() => onSelectMove?.({ from: aggressiveMove.uci.slice(0, 2), to: aggressiveMove.uci.slice(2, 4) })}
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg width="60" height="60" fill="currentColor" className="text-rose-400" viewBox="0 0 24 24"><path d="M14.5 17.5L3 6v14l3.75-2.25L10 16.5l4.5 4.5 6-15z" /></svg>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-rose-400 text-xs font-bold uppercase tracking-wider">Top Aggressive</span>
                                <span className="text-rose-300 font-mono text-sm">{formatScore(aggressiveMove.score)}</span>
                            </div>
                            <div className="text-3xl font-black text-white mb-2">{aggressiveMove.san}</div>
                            <p className="text-rose-200/60 text-xs leading-relaxed">
                                A strong alternative that creates immediate threats.
                            </p>
                        </div>
                    </div>
                )}

                {!bestMove && !isAnalyzing && (
                    <div className="text-neutral-500 text-sm text-center py-4">
                        Analysis ready.
                    </div>
                )}
            </div>

            {/* Explain Button & Content */}
            {bestMove && (
                <div className="space-y-4 pt-2">
                    {!explanation ? (
                        <button
                            onClick={handleExplain}
                            disabled={isExplaining}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm py-3 rounded-lg font-medium transition-colors border border-neutral-700 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="text-lg">🤖</span>
                            {isExplaining ? "Asking Gemini..." : "Explain These Moves"}
                        </button>
                    ) : (
                        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span>✨</span> Gemini Analysis
                                </span>
                                <button onClick={() => setExplanation(null)} className="text-neutral-500 hover:text-white">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <p className="text-neutral-300 text-sm leading-relaxed">
                                {explanation}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
