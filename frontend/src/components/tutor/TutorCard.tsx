import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useStockfish } from '../../hooks/useStockfish';
import { MoveAnalysisCard } from './MoveAnalysisCard';

interface TutorSectionProps {
    fen: string;
    onSelectMove?: (move: { from: string, to: string }) => void;
    orientation?: "white" | "black";
}

export function TutorCard({ fen, onSelectMove, orientation }: TutorSectionProps) {
    const { isReady, lines, isAnalyzing, evaluatePosition, resetAnalysis } = useStockfish();
    const [autoExplain, setAutoExplain] = useState(false);

    // Trigger analysis when FEN changes
    useEffect(() => {
        if (!isReady || !fen) return;

        // If orientation is provided (e.g. "white" for user), only analyze when it's our turn
        if (orientation) {
            try {
                const chess = new Chess(fen);
                const turn = chess.turn() === 'w' ? 'white' : 'black';
                if (turn !== orientation) {
                    resetAnalysis();
                    return;
                }
            } catch (e) {
                console.error("Invalid FEN:", fen);
            }
        }

        evaluatePosition(fen, 15);
    }, [fen, isReady, evaluatePosition, orientation, resetAnalysis]);

    // Derived Moves
    const bestMove = lines[0];
    const alternativeMove = lines[1];

    return (
        <div className="flex flex-col gap-4 w-full max-w-md">
            {/* Header with Global Controls */}
            <div className="flex items-center justify-between bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-yellow-500">⚡</span> AI Tutor
                    </h2>
                    <div className="h-4 w-px bg-neutral-700 mx-1"></div>
                    <button
                        onClick={() => setAutoExplain(!autoExplain)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${autoExplain
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'
                            }`}
                        title="Automatically request explanations for both moves"
                    >
                        <div className={`w-2 h-2 rounded-full transition-colors ${autoExplain ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-neutral-600 group-hover:bg-neutral-500'}`} />
                        AUTO
                    </button>
                </div>

                <div className="text-xs text-neutral-500 font-mono">
                    {isAnalyzing ? (
                        <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            Scanning...
                        </span>
                    ) : (
                        <span>Done (d{lines[0]?.depth || 0})</span>
                    )}
                </div>
            </div>

            {/* Cards Area */}
            <div className="flex flex-col gap-3">

                {!lines.length && !bestMove && (
                    <div className="p-8 text-center text-neutral-500 text-sm border border-neutral-800 rounded-lg">
                        {isAnalyzing ? (
                            <span className="animate-pulse">Thinking...</span>
                        ) : (
                            <span>Waiting for opponent...</span>
                        )}
                    </div>
                )}

                {/* Rank 1 Card */}
                {bestMove && (
                    <MoveAnalysisCard
                        fen={fen}
                        move={bestMove}
                        rank={1}
                        bestMove={bestMove}
                        alternative={alternativeMove} // Provide alternative comparison for Best Move
                        autoExplain={autoExplain}
                        isAnalyzing={isAnalyzing}
                        onSelect={() => onSelectMove?.({
                            from: bestMove.uci.slice(0, 2),
                            to: bestMove.uci.slice(2, 4)
                        })}
                    />
                )}

                {/* Rank 2 Card */}
                {alternativeMove && (
                    <MoveAnalysisCard
                        fen={fen}
                        move={alternativeMove}
                        rank={2}
                        bestMove={bestMove}
                        autoExplain={autoExplain}
                        isAnalyzing={isAnalyzing}
                        onSelect={() => onSelectMove?.({
                            from: alternativeMove.uci.slice(0, 2),
                            to: alternativeMove.uci.slice(2, 4)
                        })}
                    />
                )}
            </div>
        </div>
    );
}
