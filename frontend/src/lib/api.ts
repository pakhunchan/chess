const API_BASE = "http://localhost:8000";

export interface GameResponse {
  game_id: string;
  status: "active" | "finished";
  turn: "white" | "black";
  result: "white_win" | "black_win" | "draw" | null;
  current_position: string;
  difficulty: number;
  moves: { move_number: number; move: string }[];
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
  6: "Maximum",
};

export interface MoveResponse {
  status: "active" | "finished";
  turn: "white" | "black";
  result: "white_win" | "black_win" | "draw" | null;
  current_position: string;
  last_moves: string[];
}

export async function createGame(difficulty: number = 3): Promise<GameResponse> {
  const res = await fetch(`${API_BASE}/games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ difficulty }),
  });
  if (!res.ok) {
    throw new Error("Failed to create game");
  }
  return res.json();
}

export async function getGame(gameId: string): Promise<GameResponse> {
  const res = await fetch(`${API_BASE}/games/${gameId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch game");
  }
  return res.json();
}

export async function makeMove(
  gameId: string,
  move: string
): Promise<MoveResponse> {
  const res = await fetch(`${API_BASE}/games/${gameId}/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ move }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Invalid move");
  }
  return res.json();
}
