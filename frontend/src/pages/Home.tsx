import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createGame } from "@/lib/api";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePlayAsGuest = async () => {
    setLoading(true);
    try {
      const game = await createGame();
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

      <div className="flex flex-col gap-4 w-64">
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
