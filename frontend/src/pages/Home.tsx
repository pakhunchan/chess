import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createGame, DIFFICULTY_LABELS } from "@/lib/api";

const DIFFICULTIES = [1, 2, 3, 4, 5, 6] as const;

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState(3);

  const handlePlayAsGuest = async () => {
    setLoading(true);
    try {
      const game = await createGame(difficulty);
      navigate(`/game/${game.game_id}`);
    } catch (error) {
      console.error("Failed to create game:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">Chess</h1>
        <p className="text-muted-foreground">Play against the computer</p>
      </div>

      <div className="flex flex-col gap-6 w-80">
        <div className="space-y-3">
          <label className="text-sm font-medium text-center block">
            Difficulty
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((level) => (
              <Button
                key={level}
                variant={difficulty === level ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(level)}
              >
                {DIFFICULTY_LABELS[level]}
              </Button>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={handlePlayAsGuest} disabled={loading}>
          {loading ? "Starting..." : "Play as Guest"}
        </Button>

        <Button size="lg" variant="outline" disabled>
          Sign In (Coming Soon)
        </Button>
      </div>
    </div>
  );
}
