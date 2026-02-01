import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error("VITE_API_URL environment variable is not set");
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    return { "Content-Type": "application/json" };
  }

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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
  6: "Insane",
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
    headers: await getAuthHeaders(),
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
    headers: await getAuthHeaders(),
    body: JSON.stringify({ move }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Invalid move");
  }
  const data = await res.json();
  return data;
}


export async function registerUser(username: string): Promise<{ status: string; username: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to set username");
  }
  return res.json();
}

export interface TutorResponse {
  explanation: string;
}

export async function explainMove(
  fen: string,
  move: string,
  best_move?: string
): Promise<TutorResponse> {
  const res = await fetch(`${API_BASE}/tutor/explain`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ fen, move, best_move }),
  });
  if (!res.ok) {
    throw new Error("Failed to get explanation");
  }
  return res.json();
}
