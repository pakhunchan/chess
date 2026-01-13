import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createGame, DIFFICULTY_LABELS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const DIFFICULTIES = [1, 2, 3, 4, 5, 6] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 relative">
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {authLoading ? (
          <Button variant="outline" disabled>
            Loading...
          </Button>
        ) : user ? (
          <>
            <div className="flex items-center gap-4">
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
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
            {!user.emailVerified && (
              <div className="bg-yellow-500/10 text-yellow-500 text-sm px-3 py-1 rounded-md border border-yellow-500/20">
                Please verify your email
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Log In
            </Button>
            <Button variant="default" onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        )}
      </div>

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
          {loading ? "Starting..." : (user ? "Play" : "Play as Guest")}
        </Button>
      </div>
    </div>
  );
}
