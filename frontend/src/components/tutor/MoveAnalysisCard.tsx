import { useState, useEffect } from 'react';
import type { StockfishLine } from '../../hooks/useStockfish';
import { Chess } from 'chess.js';

interface MoveAnalysisCardProps {
    fen: string;
    move: StockfishLine | null;
    rank: number;
    bestMove: StockfishLine | null;
    alternative?: StockfishLine; // Added optional alternative context
    autoExplain: boolean;
    isAnalyzing: boolean;
    onExplainRequest?: () => void;
    onSelect?: () => void;
    onHover?: (isHovering: boolean) => void;
}

export function MoveAnalysisCard({ fen, move, rank, bestMove, alternative, autoExplain, isAnalyzing, onSelect, onHover }: MoveAnalysisCardProps) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);

    const [isDismissed, setIsDismissed] = useState(false);

    // Derived state for display
    const [displayInfo, setDisplayInfo] = useState<{ san: string, score: string }>({ san: '...', score: '...' });

    // Process move notation (SAN) and score
    useEffect(() => {
        if (!move) return;
        try {
            const chess = new Chess(fen);
            const m = chess.move({
                from: move.uci.slice(0, 2),
                to: move.uci.slice(2, 4),
                promotion: move.uci.length > 4 ? move.uci.slice(4) as any : undefined
            });
            if (move.mate !== undefined) {
                setDisplayInfo({ san: m.san, score: `Mate in ${move.mate}` });
            } else {
                const evalScore = (move.score / 100).toFixed(2);
                setDisplayInfo({
                    san: m.san,
                    score: move.score > 0 ? `+${evalScore}` : evalScore
                });
            }
        } catch (e) {
            setDisplayInfo({ san: move.uci, score: '...' });
        }
    }, [fen, move]);

    // Reset explanation when FEN changes (new move)
    useEffect(() => {
        if (!move) return;
        setExplanation(null);
    }, [fen, move?.uci]);

    // Independent Explain Handler
    async function handleExplain(e?: React.MouseEvent) {
        if (e) e.stopPropagation(); // Prevent card click
        if (!fen || !move || !bestMove) return;
        setIsExplaining(true);
        try {
            const res = await import('../../lib/api').then(m => m.explainMove(
                fen,
                move.uci,
                bestMove.uci,
                move.pv,
                bestMove.pv,
                alternative?.uci,
                alternative?.pv
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
        if (move && autoExplain && !explanation && !isExplaining && isAnalyzing && move.depth >= 15) {
            handleExplain();
        }
    }, [autoExplain, explanation, isExplaining, isAnalyzing, move?.depth]);

    // Render nothing if no move data (BUT hooks still run)
    if (!move) return null;

    const isRank1 = rank === 1;
    const bgClass = isRank1 ? 'bg-gradient-to-br from-indigo-900/40 to-indigo-900/10 border-indigo-500/30' : 'bg-neutral-800/80 border-neutral-700';

    return (
        <div
            onClick={() => {
                setIsDismissed(true);
                onHover?.(false);
                onSelect?.();
            }}
            onMouseEnter={() => {
                if (!isDismissed) {
                    onHover?.(true);
                }
            }}
            onMouseLeave={() => {
                setIsDismissed(false);
                onHover?.(false);
            }}
            className={`group relative overflow-hidden border rounded-lg p-4 transition-all cursor-pointer hover:border-indigo-400/50 ${bgClass}`}
        >

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
            {/* PV Line (Subtle) */}
            <div className="text-xs font-mono truncate mb-4 opacity-90">
                {move.pv.split(' ').map((m, i) => {
                    const isWhiteTurn = new Chess(fen).turn() === 'w';
                    // If i is even (0, 2), it's the "current" turn.
                    // If isWhiteTurn is true, then evens are White, odds are Black.
                    const isWhiteMove = isWhiteTurn ? (i % 2 === 0) : (i % 2 !== 0);

                    return (
                        <span key={i} className={`mr-2 ${isWhiteMove ? 'text-white' : 'text-neutral-500'}`}>
                            {m}
                        </span>
                    );
                })}
            </div>

            {/* Explanation Area */}
            <div className="min-h-[140px] flex flex-col justify-end">
                {explanation ? (
                    <div className="bg-black/30 rounded p-3 mb-3 border border-white/5" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-gray-300 leading-relaxed animate-in fade-in duration-500">
                            {explanation}
                        </p>
                    </div>
                ) : (
                    <div className="h-full flex items-end">
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
                )}
            </div>
        </div>
    );
}
