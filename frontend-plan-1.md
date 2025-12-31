# Frontend Plan: Sign-in & Chess Board

## Overview
Build two pages: a landing/sign-in page and a chess game page. All game logic is handled by the backend API - the frontend is purely UI.

## Architecture Decisions
- **Routing**: react-router-dom (standard, well-supported)
- **Chess Board**: react-chessboard (drag-drop support, works with FEN strings from backend)
- **State**: React Context for simple auth/session state
- **API**: fetch wrapper for backend calls (http://localhost:8000)

## Pages

### 1. Landing/Sign-in Page (`/`)
- Title/branding
- Two buttons:
  - "Play as Guest" → creates game via API, redirects to `/game/{id}`
  - "Sign In" → placeholder for future auth (disabled or shows "coming soon")

### 2. Game Page (`/game/:gameId`)
- Chess board (react-chessboard)
- Displays current position from backend FEN
- Player makes move → `POST /games/{id}/move` → backend validates & returns new position + computer move
- Shows game status (active/finished, result)
- Move history sidebar (optional, from API response)

## File Structure
```
src/
├── main.tsx
├── App.tsx              # Router setup
├── index.css
├── lib/
│   ├── utils.ts
│   └── api.ts           # Backend API client
├── components/
│   ├── ui/              # shadcn components
│   └── chess/
│       └── ChessBoard.tsx  # Wrapper around react-chessboard
└── pages/
    ├── Home.tsx         # Landing/sign-in page
    └── Game.tsx         # Chess game page
```

## Implementation Steps

1. **Install dependencies**
   - react-router-dom
   - react-chessboard

2. **Create API client** (`src/lib/api.ts`)
   - `createGame()` → POST /games
   - `getGame(id)` → GET /games/{id}
   - `makeMove(id, move)` → POST /games/{id}/move

3. **Set up routing** (`src/App.tsx`)
   - `/` → Home page
   - `/game/:gameId` → Game page

4. **Build Home page** (`src/pages/Home.tsx`)
   - "Play as Guest" button that calls `createGame()` and navigates to `/game/{id}`

5. **Build Game page** (`src/pages/Game.tsx`)
   - Fetch game state on mount
   - Render ChessBoard with current FEN
   - Handle move submission → API call → update board
   - Display game status and result

6. **ChessBoard component** (`src/components/chess/ChessBoard.tsx`)
   - Wrap react-chessboard
   - Props: position (FEN), onMove callback, disabled state
   - Handle drag-drop move conversion to UCI format (e2e4)

## API Integration
```typescript
// All moves validated by backend
const handleMove = async (from: string, to: string) => {
  const move = `${from}${to}`;  // UCI format
  const result = await makeMove(gameId, move);
  if (result.error) {
    // Invalid move - board stays unchanged
    return false;
  }
  // Update board with new position (includes computer's response)
  setPosition(result.current_position);
  return true;
};
```

## Notes
- Backend runs on http://localhost:8000
- Backend auto-plays computer move after human move
- FEN string from backend used directly for board position
- No client-side chess validation needed
