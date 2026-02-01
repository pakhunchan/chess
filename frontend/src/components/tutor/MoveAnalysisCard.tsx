import { useState, useEffect } from 'react';
import type { StockfishLine } from '../../hooks/useStockfish';
import { Chess } from 'chess.js';

interface MoveAnalysisCardProps {
    fen: string;
    move: StockfishLine;
    rank: number;
    bestMove: StockfishLine;
    autoExplain: boolean;
    isAnalyzing: boolean;
    onExplainRequest?: () => void;
}

export function MoveAnalysisCard({ fen, move, rank, bestMove, autoExplain, isAnalyzing }: MoveAnalysisCardProps) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);

    // Derived state for display
    const [displayInfo, setDisplayInfo] = useState<{ san: string, score: string }>({ san: '...', score: '...' });

    // Process move notation (SAN) and score
    useEffect(() => {
        try {
            const chess = new Chess(fen);
            const m = chess.move({
                from: move.uci.slice(0, 2),
                to: move.uci.slice(2, 4),
                promotion: move.uci.length > 4 ? move.uci.slice(4) as any : undefined
            });
            const evalScore = (move.score / 100).toFixed(2);
            setDisplayInfo({
                san: m.san,
                score: move.score > 0 ? `+${evalScore}` : evalScore
            });
        } catch (e) {
            setDisplayInfo({ san: move.uci, score: '...' });
        }
    }, [fen, move]);

    // Reset explanation when FEN changes (new move)
    useEffect(() => {
        setExplanation(null);
    }, [fen, move.uci]);

    // Independent Explain Handler
    async function handleExplain() {
        if (!fen) return;
        setIsExplaining(true);
        try {
            const res = await import('../../lib/api').then(m => m.explainMove(
                fen,
                move.uci,      // "User's Move" -> The move this card is about
                bestMove.uci,  // "Best Context" -> Always the rank 1 move
                move.pv,       // PV for this move
                bestMove.pv    // PV for best move context
            ));

            setExplanation(res.explanation);
        } catch (e) {
            console.error(e);
        } finally {
            setIsExplaining(false);
        }
    }

    // Auto-Explain Logic
    useEffect(() => {
        if (autoExplain && !explanation && !isExplaining && isAnalyzing && move.depth >= 10) {
            handleExplain();
        }
    }, [autoExplain, explanation, isExplaining, isAnalyzing, move.depth]);

    const isRank1 = rank === 1;
    const bgClass = isRank1 ? 'bg-gradient-to-br from-indigo-900/40 to-indigo-900/10 border-indigo-500/30' : 'bg-neutral-800/80 border-neutral-700';

    return (
        <div className={`group relative overflow-hidden border rounded-lg p-4 transition-all ${bgClass}`}>

            {/* Header / Move Info */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isRank1 ? 'bg-indigo-500 text-white' : 'bg-neutral-600 text-white'
                        }`}>
                        {rank}
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white leading-none">{displayInfo.san}</div>
                    </div>
                </div>
                <div className={`font-mono text-sm font-bold ${move.score > 0 ? 'text-emerald-400' : move.score < 0 ? 'text-rose-400' : 'text-neutral-400'
                    }`}>
                    {displayInfo.score}
                </div>
            </div>

            {/* PV Line (Subtle) */}
            <div className="text-xs text-neutral-500 font-mono truncate mb-4 opacity-70">
                {move.pv}
            </div>

            {/* Explanation Area */}
            {explanation ? (
                <div className="bg-black/30 rounded p-3 mb-3 border border-white/5">
                    <p className="text-sm text-gray-300 leading-relaxed animate-in fade-in duration-500">
                        {explanation}
                    </p>
                </div>
            ) : null}

            {/* Action Button */}
            {!explanation && (
                <button
                    onClick={handleExplain}
                    disabled={isExplaining || isAnalyzing}
                    className={`w-full py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isExplaining
                            ? 'bg-neutral-800 text-neutral-500 cursor-wait'
                            : isRank1
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                        }`}
                >
                    {isExplaining ? (
                        <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Asking Gemini...
                        </>
                    ) : (
                        <>
                            <span>✨ Explain This Move</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
