import { renderHook, act } from "@testing-library/react";
import { usePremove } from "./usePremove";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API
const mockMakeMove = vi.fn();
vi.mock("@/lib/api", () => ({
    makeMove: (...args: any[]) => mockMakeMove(...args)
}));

describe("usePremove", () => {
    const mockOnSuccess = vi.fn();
    const mockOnError = vi.fn();
    const gameId = "game-123";

    // Starting position
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    // After e4
    const e4Fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    const baseGame = {
        game_id: "1",
        status: "active",
        result: null,
        difficulty: "medium",
        current_position: startFen, // White to move
        turn: "white",
        last_moves: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should start with empty queue", () => {
        const { result } = renderHook(() => usePremove({
            game: baseGame as any,
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        expect(result.current.premoveQueue).toEqual([]);
        expect(result.current.previewPosition).toBeNull();
    });

    it("should auto-execute premove if added during White's turn", async () => {
        const { result } = renderHook(() => usePremove({
            game: baseGame as any, // White to move
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        await act(async () => {
            // e2 -> e4. 
            // Logic allows queueing.
            // Effect sees White turn + Queue. Auto-executes using mockMakeMove.
            const added = result.current.addPremove("e2", "e4");
            expect(added).toBe(true);
        });

        // Queue should be empty immediately after execution starts (optimistic removal)
        expect(result.current.premoveQueue.length).toBe(0);

        // Assert that the move WAS attempted
        expect(mockMakeMove).toHaveBeenCalledWith(gameId, "e2e4");
    });

    it("should add valid premove during Opponent's turn (Black)", () => {
        const blackTurnGame = { ...baseGame, turn: "black", current_position: e4Fen }; // Black to move

        const { result } = renderHook(() => usePremove({
            game: blackTurnGame as any,
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        // User wants to premove Nf3 (g1 -> f3)
        // e4 is played. White Knight at g1 can move to f3.
        // Internal logic forces FEN to White Turn.
        act(() => {
            const added = result.current.addPremove("g1", "f3");
            expect(added).toBe(true);
        });

        expect(result.current.premoveQueue).toHaveLength(1);
        expect(result.current.premoveQueue[0]).toEqual({ from: "g1", to: "f3", promotion: undefined });
        expect(result.current.previewPosition).toContain("N"); // Should show moved state
        // Should NOT have executed yet
        expect(mockMakeMove).not.toHaveBeenCalled();
    });

    it("should reject invalid premove", () => {
        const blackTurnGame = { ...baseGame, turn: "black", current_position: e4Fen };

        const { result } = renderHook(() => usePremove({
            game: blackTurnGame as any,
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        act(() => {
            // Illegal move: pawn e2-e5 (impossible jump from e2 if e2 is empty, or jump too far)
            // In e4Fen, e2 is empty. e4 is occupied.
            const added = result.current.addPremove("e2", "e5");
            expect(added).toBe(false);
        });

        expect(result.current.premoveQueue).toHaveLength(0);
    });

    it("should clear queue on cancel", () => {
        const blackTurnGame = { ...baseGame, turn: "black", current_position: e4Fen };
        const { result } = renderHook(() => usePremove({
            game: blackTurnGame as any,
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        act(() => {
            result.current.addPremove("g1", "f3");
        });
        expect(result.current.premoveQueue).toHaveLength(1);

        act(() => {
            result.current.cancelPremoves();
        });
        expect(result.current.premoveQueue).toHaveLength(0);
        expect(result.current.previewPosition).toBeNull();
    });
    it("should allow chaining premoves (A->B, then B->C)", () => {
        const blackTurnGame = { ...baseGame, turn: "black", current_position: e4Fen };
        const { result } = renderHook(() => usePremove({
            game: blackTurnGame as any,
            gameId,
            onMoveSuccess: mockOnSuccess,
            onMoveError: mockOnError
        }));

        act(() => {
            // 1. g1 -> f3
            result.current.addPremove("g1", "f3");
        });

        // 2. f3 -> g5 (Chain off the preview position)
        act(() => {
            const added = result.current.addPremove("f3", "g5");
            expect(added).toBe(true);
        });

        expect(result.current.premoveQueue).toHaveLength(2);
        expect(result.current.premoveQueue[1]).toEqual({ from: "f3", to: "g5", promotion: undefined });
    });

    it("should clear queue if updated game state invalidates premove", async () => {
        const blackTurnGame = { ...baseGame, turn: "black", current_position: e4Fen };
        const { result, rerender } = renderHook((props) => usePremove(props), {
            initialProps: {
                game: blackTurnGame as any,
                gameId,
                onMoveSuccess: mockOnSuccess,
                onMoveError: mockOnError
            }
        });

        // 1. Queue valid move: g1 -> f3
        act(() => {
            result.current.addPremove("g1", "f3");
        });
        expect(result.current.premoveQueue).toHaveLength(1);

        // 2. Simullate Opponent Turn Update:
        // Opponent CAPTURES the piece at g1.
        // FEN with g1 empty: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1" -> g1 is occupied.
        // Remove 'N' from g1.
        // White side FEN: RNBQKB1R (N missing)
        const invalidatingFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 1";

        const newGame = { ...baseGame, turn: "white", current_position: invalidatingFen };

        await act(async () => {
            rerender({
                game: newGame as any,
                gameId,
                onMoveSuccess: mockOnSuccess,
                onMoveError: mockOnError
            });
        });

        // Queue should clear because 'g1->f3' is now blocked by pawn at f3
        expect(result.current.premoveQueue).toHaveLength(0);
        expect(mockMakeMove).not.toHaveBeenCalled();
    });
});
