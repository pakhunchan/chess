import { useEffect, useRef, useState, useCallback } from 'react';

export interface StockfishLine {
    id: number;
    depth: number;
    score: number; // centipawns
    mate?: number; // moves to mate
    uci: string;   // e.g. "e2e4"
    pv: string;    // e.g. "e2e4 e7e5 g1f3"
}

export function useStockfish() {
    const workerRef = useRef<Worker | null>(null);
    const shouldIgnoreMessages = useRef(false);
    const [isReady, setIsReady] = useState(false);
    const [lines, setLines] = useState<StockfishLine[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        // Initialize Worker with absolute path
        const worker = new Worker("/stockfish/stockfish.js");
        workerRef.current = worker;

        worker.onerror = (err) => {
            console.error("Stockfish Worker Error:", err);
        };

        worker.onmessage = (e) => {
            // STRICT GUARD: If we requested a stop, ignore any trailing messages to prevent UI flicker
            if (shouldIgnoreMessages.current) return;

            const msg = e.data;
            if (msg === "uciok") {
                setIsReady(true);
            }

            // Parse info lines for MultiPV
            // Example: info depth 10 seldepth 15 multipv 1 score cp 50 nodes 1000 nps 1000 pv e2e4 e7e5
            if (typeof msg === 'string' && msg.startsWith("info") && msg.includes("pv")) {
                // Simple parser
                const depthMatch = msg.match(/depth (\d+)/);
                const scoreMatch = msg.match(/score cp (-?\d+)/);
                const mateMatch = msg.match(/score mate (-?\d+)/);
                const multipvMatch = msg.match(/multipv (\d+)/);
                const pvIndex = msg.indexOf(" pv ");

                if (depthMatch && (scoreMatch || mateMatch) && multipvMatch && pvIndex !== -1) {
                    const multipv = parseInt(multipvMatch[1]);
                    const depth = parseInt(depthMatch[1]);
                    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
                    const mate = mateMatch ? parseInt(mateMatch[1]) : undefined;
                    const pv = msg.substring(pvIndex + 4).trim();
                    const uci = pv.split(" ")[0];

                    setLines(prev => {
                        const newLines = [...prev];
                        // Replace or add line for this multipv index
                        const index = newLines.findIndex(l => l.id === multipv);
                        const newLine = { id: multipv, depth, score, mate, uci, pv };
                        if (index !== -1) {
                            newLines[index] = newLine;
                        } else {
                            newLines.push(newLine);
                        }
                        // Sort by score (descending for white, technically engine always reports relative to itself? 
                        // Stockfish reports score from side to move perspective usually, but in MultiPV it sorts best first)
                        return newLines.sort((a, b) => a.id - b.id);
                    });
                }
            }

            if (msg.startsWith("bestmove")) {
                setIsAnalyzing(false);
            }
        };

        worker.postMessage("uci");
        // Configure to 3 lines
        worker.postMessage("setoption name MultiPV value 3");

        return () => {
            worker.terminate();
        };
    }, []);

    const evaluatePosition = useCallback((fen: string, depth: number = 15) => {
        if (!workerRef.current) return;

        shouldIgnoreMessages.current = false; // Unblock messages for new analysis
        setIsAnalyzing(true);
        setLines([]); // Clear previous
        workerRef.current.postMessage("stop");
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(`go depth ${depth}`);
    }, []);

    const stopAnalysis = useCallback(() => {
        if (!workerRef.current) return;
        shouldIgnoreMessages.current = true; // Block incoming messages immediately
        workerRef.current.postMessage("stop");
        setIsAnalyzing(false); // Immediate feedback
    }, []);

    return { isReady, lines, isAnalyzing, evaluatePosition, stopAnalysis };
}
