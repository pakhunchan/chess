import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createGame, DIFFICULTY_LABELS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const DIFFICULTIES = [1, 2, 3, 4, 5, 6] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
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

        {authLoading ? (
          <Button size="lg" variant="outline" disabled>
            Loading...
          </Button>
        ) : user ? (
          <div className="flex flex-col gap-3 items-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-muted rounded-lg">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium">
                {user.displayName || user.email}
              </span>
            </div>
            <Button size="lg" variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        ) : (
          <Button size="lg" variant="outline" onClick={signInWithGoogle}>
            Sign In with Google
          </Button>
        )}
      </div>
    </div>
  );
}
