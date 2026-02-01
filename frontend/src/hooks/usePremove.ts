import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { type GameResponse, type MoveResponse, makeMove } from "@/lib/api";

export type Premove = { from: string; to: string; promotion?: string };

interface UsePremoveProps {
    game: GameResponse | null;
    gameId: string | undefined;
    onMoveSuccess: (result: MoveResponse) => void;
    onMoveError: (error: string) => void;
}

export function usePremove({ game, gameId, onMoveSuccess, onMoveError }: UsePremoveProps) {
    const [premoveQueue, setPremoveQueue] = useState<Premove[]>([]);
    const [previewPosition, setPreviewPosition] = useState<string | null>(null);
    const isExecutingPremove = useRef(false);

    // Helper: Force turn to white for preview generation/validation
    const forceWhiteTurn = (fen: string) => {
        const tokens = fen.split(" ");
        if (tokens[1] === "b") {
            tokens[1] = "w";
            tokens[3] = "-";
        }
        return tokens.join(" ");
    };

    const addPremove = useCallback((from: string, to: string, promotion?: string) => {
        if (!game) return false;

        const currentPreviewFen = previewPosition || game.current_position;
        const forcedWhiteFen = forceWhiteTurn(currentPreviewFen);

        try {
            const previewChess = new Chess(forcedWhiteFen);
            const moveResult = previewChess.move({
                from,
                to,
                promotion: promotion as "q" | "r" | "b" | "n" | undefined,
            });

            if (moveResult) {
                setPremoveQueue(prev => [...prev, { from, to, promotion }]);
                setPreviewPosition(previewChess.fen());
                return true;
            }
        } catch (e) {
            console.error("Premove error:", e);
            return false;
        }
        return false;
    }, [game, previewPosition]);

    const cancelPremoves = useCallback(() => {
        setPremoveQueue([]);
        setPreviewPosition(null);
    }, []);

    // Failsafe: Ensure preview is cleared if queue is empty
    useEffect(() => {
        if (premoveQueue.length === 0 && previewPosition) {
            setPreviewPosition(null);
        }
    }, [premoveQueue, previewPosition]);

    // Sync Effect: Recalculate preview when game position updates (e.g. opponent moves)
    useEffect(() => {
        if (!game || premoveQueue.length === 0) return;

        let fen = game.current_position;
        let valid = true;

        // Re-apply all queued moves on top of the new current_position
        for (const move of premoveQueue) {
            const forcedFen = forceWhiteTurn(fen);
            try {
                const chess = new Chess(forcedFen);
                const result = chess.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion as "q" | "r" | "b" | "n" | undefined
                });

                if (result) {
                    fen = chess.fen();
                } else {
                    valid = false;
                    break;
                }
            } catch (e) {
                valid = false;
                break;
            }
        }

        if (valid) {
            setPreviewPosition(fen);
        } else {
            // If the chain is no longer valid (e.g. opponent captured a piece we wanted to move), clear it.
            setPremoveQueue([]);
            setPreviewPosition(null);
        }
    }, [game?.current_position, premoveQueue]);

    // Execution Effect
    useEffect(() => {
        if (!game || !gameId || game.turn !== "white" || premoveQueue.length === 0 || isExecutingPremove.current) {
            return;
        }

        const executeNext = async () => {
            const nextMove = premoveQueue[0];
            const chess = new Chess(game.current_position);

            try {
                const moveResult = chess.move({
                    from: nextMove.from,
                    to: nextMove.to,
                    promotion: nextMove.promotion as "q" | "r" | "b" | "n" | undefined,
                });

                if (moveResult) {
                    isExecutingPremove.current = true;
                    // Note: We used to optimistically remove here. 
                    // But now we wait until success to prevent visual flicker (displaying stale game state before update).

                    try {
                        const moveStr = nextMove.promotion
                            ? `${nextMove.from}${nextMove.to}${nextMove.promotion}`
                            : `${nextMove.from}${nextMove.to}`;

                        const result = await makeMove(gameId, moveStr);

                        // Success! Remove from queue
                        setPremoveQueue(prev => prev.slice(1));
                        onMoveSuccess(result);
                    } catch (err) {
                        onMoveError(err instanceof Error ? err.message : "Move failed");
                        // On error, clear queue? Yes.
                        setPremoveQueue([]);
                        setPreviewPosition(null);
                    } finally {
                        isExecutingPremove.current = false;
                    }
                } else {
                    // Illegal logic (e.g. piece captured)
                    setPremoveQueue([]);
                    setPreviewPosition(null);
                }
            } catch (e) {
                setPremoveQueue([]);
                setPreviewPosition(null);
            }
        };

        executeNext();
    }, [game?.turn, game?.current_position, gameId, premoveQueue, onMoveSuccess, onMoveError]);

    return {
        premoveQueue,
        previewPosition,
        addPremove,
        cancelPremoves,
    };
}
