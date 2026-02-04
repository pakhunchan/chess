import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useStockfish } from '../../hooks/useStockfish';
import { MoveAnalysisCard } from './MoveAnalysisCard';

interface TutorSectionProps {
    fen: string;
    onSelectMove?: (move: { from: string, to: string }) => void;
    orientation?: "white" | "black";
    onPreviewHover?: (pv: string | null) => void;
}

export function TutorCard({ fen, onSelectMove, orientation, onPreviewHover }: TutorSectionProps) {
    const { isReady, lines, isAnalyzing, evaluatePosition, resetAnalysis } = useStockfish();
    const [autoExplain, setAutoExplain] = useState(false);
    const [hoveredRank, setHoveredRank] = useState<number | null>(null);

    useEffect(() => {
        if (!fen) return;
        resetAnalysis(); // Reset state when FEN changes
        evaluatePosition(fen, 15); // Auto-start (now optimized depth 15)
    }, [fen, evaluatePosition, resetAnalysis]);

    const bestMove = lines[0];
    const alternativeMove = lines[1];

    // Conditional Preview Logic
    useEffect(() => {
        // If analyzing, FORCE CLEAR the preview regardless of hover
        if (isAnalyzing) {
            onPreviewHover?.(null);
            return;
        }

        // Only preview if NOT analyzing and we have a hovered card
        if (hoveredRank === 1 && bestMove) {
            onPreviewHover?.(bestMove.pv);
        } else if (hoveredRank === 2 && alternativeMove) {
            onPreviewHover?.(alternativeMove.pv);
        } else {
            onPreviewHover?.(null);
        }
    }, [hoveredRank, isAnalyzing, bestMove, alternativeMove, onPreviewHover]);

    // Trigger auto-explain only when best move is ready
    useEffect(() => {
        if (autoExplain && bestMove) {
            // Logic handled purely in MoveAnalysisCard now
        }
    }, [bestMove, autoExplain]);

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
                <MoveAnalysisCard
                    fen={fen}
                    move={bestMove || null}
                    rank={1}
                    bestMove={bestMove || null}
                    alternative={alternativeMove} // Provide alternative comparison for Best Move
                    autoExplain={autoExplain}
                    isAnalyzing={isAnalyzing}
                    onSelect={() => {
                        if (bestMove) {
                            onSelectMove?.({
                                from: bestMove.uci.slice(0, 2),
                                to: bestMove.uci.slice(2, 4)
                            })
                        }
                    }}
                    onHover={(hover) => setHoveredRank(hover ? 1 : null)}
                />

                {/* Rank 2 Card */}
                {alternativeMove && (
                    <MoveAnalysisCard
                        fen={fen}
                        move={alternativeMove}
                        rank={2}
                        bestMove={bestMove || null}
                        alternative={bestMove || undefined}
                        autoExplain={autoExplain}
                        isAnalyzing={isAnalyzing}
                        onSelect={() => onSelectMove?.({
                            from: alternativeMove.uci.slice(0, 2),
                            to: alternativeMove.uci.slice(2, 4)
                        })}
                        onHover={(hover) => setHoveredRank(hover ? 2 : null)}
                    />
                )}
            </div>
        </div>
    );
}
