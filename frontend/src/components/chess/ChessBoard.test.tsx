import { render } from "@testing-library/react";
import ChessBoard from "./ChessBoard";
import { describe, it, vi } from "vitest";

// Mock react-chessboard because it relies on browser-specifics often?
// Or try to run it. JSdom handles it usually.
// But we need to see how it calls onPieceDrop.
// If we mock it, we assume behavior.
// Let's try to verify if Typescript is happy or if it renders.

// Mock react-chessboard
vi.mock("react-chessboard", () => ({
    Chessboard: (props: any) => (
        <div data-testid="mock-chessboard">
            Board Position: {props.options?.position || props.position}
        </div>
    ),
}));

describe("ChessBoard Component", () => {
    const mockOnMove = vi.fn();

    it("renders without crashing", () => {
        render(
            <ChessBoard
                position="start"
                onMove={mockOnMove}
            />
        );
        // If it throws, test fails.
    });
});
