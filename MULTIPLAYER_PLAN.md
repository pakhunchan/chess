# Multiplayer Implementation Plan

## Overview

Add multiplayer functionality to the chess application with:
- Multiple authentication options (anonymous, accounts, OAuth)
- Real-time updates via WebSockets
- Shareable game links for playing with friends
- Random matchmaking for playing strangers

---

## Phase 1: Database & Models

### New Tables

```sql
-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),  -- NULL for OAuth/anonymous
    oauth_provider VARCHAR(50),  -- 'google', 'github', NULL
    oauth_id VARCHAR(255),
    display_name VARCHAR(100) NOT NULL,
    elo_rating INTEGER DEFAULT 1200,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

-- Session tokens (for anonymous + authenticated users)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Games Table

```sql
ALTER TABLE games ADD COLUMN game_code VARCHAR(8) UNIQUE;  -- Shareable code
ALTER TABLE games ADD COLUMN white_player_id UUID REFERENCES players(id);
ALTER TABLE games ADD COLUMN black_player_id UUID REFERENCES players(id);
ALTER TABLE games ADD COLUMN game_type VARCHAR(20) DEFAULT 'solo';  -- 'solo', 'private', 'ranked'
ALTER TABLE games ADD COLUMN time_control INTEGER;  -- seconds per player (NULL = unlimited)
ALTER TABLE games ADD COLUMN white_time_remaining INTEGER;
ALTER TABLE games ADD COLUMN black_time_remaining INTEGER;
ALTER TABLE games ADD COLUMN winner_id UUID REFERENCES players(id);
ALTER TABLE games ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE games ADD COLUMN started_at TIMESTAMP;
ALTER TABLE games ADD COLUMN finished_at TIMESTAMP;
```

### Files to Create/Modify

- `backend/app/models.py` - Add Player, Session models, update Game model
- `backend/alembic/versions/xxx_add_multiplayer.py` - Migration script

---

## Phase 2: Authentication System

### 2.1 Anonymous Players

- Auto-create player with random display name on first visit
- Store session token in localStorage
- No password required
- Can optionally "upgrade" to full account later

### 2.2 Simple Accounts

- Username/email + password registration
- Password hashing with bcrypt
- JWT tokens for API authentication
- Password reset via email (optional)

### 2.3 OAuth (Google)

- Google OAuth 2.0 integration
- Link/unlink OAuth to existing account
- Auto-create account on first OAuth login

### New Endpoints

```
POST /auth/anonymous          - Create anonymous session
POST /auth/register           - Create account with email/password
POST /auth/login              - Login with email/password
POST /auth/logout             - Invalidate session
GET  /auth/me                 - Get current player info
POST /auth/google             - OAuth login/register
PUT  /auth/upgrade            - Convert anonymous to full account
```

### Files to Create

- `backend/app/services/auth_service.py` - Auth logic
- `backend/app/routers/auth.py` - Auth endpoints
- `backend/app/dependencies.py` - Auth middleware, get_current_player
- `frontend/src/lib/auth.ts` - Auth API client
- `frontend/src/contexts/AuthContext.tsx` - Auth state management
- `frontend/src/pages/Login.tsx` - Login/register page
- `frontend/src/components/AuthGuard.tsx` - Protected route wrapper

---

## Phase 3: Game Matching

### 3.1 Private Games (Shareable Links)

Flow:
1. Player 1 clicks "Play with Friend"
2. Backend creates game with unique `game_code` (e.g., "ABC123")
3. Player 1 gets shareable link: `chess.pakhunchan.com/join/ABC123`
4. Player 1 waits in lobby (WebSocket connected)
5. Player 2 opens link, joins as black
6. Both players notified, game starts

### 3.2 Random Matchmaking

Flow:
1. Player clicks "Play Online"
2. Player added to matchmaking queue (Redis or in-memory)
3. Backend pairs players with similar ELO (±200)
4. Both players notified via WebSocket, game starts

### New Endpoints

```
POST /games/private           - Create private game, returns game_code
POST /games/join/{code}       - Join private game by code
POST /matchmaking/join        - Join matchmaking queue
POST /matchmaking/leave       - Leave matchmaking queue
GET  /matchmaking/status      - Check queue status
```

### Files to Create

- `backend/app/services/matchmaking_service.py` - Queue management
- `backend/app/routers/matchmaking.py` - Matchmaking endpoints

---

## Phase 4: WebSocket Real-time Communication

### WebSocket Events

**Client → Server:**
```json
{ "type": "join_game", "game_id": "uuid" }
{ "type": "move", "game_id": "uuid", "move": "e2e4" }
{ "type": "resign", "game_id": "uuid" }
{ "type": "offer_draw", "game_id": "uuid" }
{ "type": "accept_draw", "game_id": "uuid" }
{ "type": "decline_draw", "game_id": "uuid" }
```

**Server → Client:**
```json
{ "type": "game_start", "game": {...}, "your_color": "white" }
{ "type": "opponent_joined", "opponent": {...} }
{ "type": "move_made", "move": "e2e4", "position": "fen...", "turn": "black" }
{ "type": "game_over", "result": "white_win", "reason": "checkmate" }
{ "type": "draw_offered" }
{ "type": "draw_declined" }
{ "type": "opponent_disconnected" }
{ "type": "opponent_reconnected" }
{ "type": "time_update", "white_time": 300, "black_time": 285 }
```

### Connection Management

- Authenticate WebSocket on connect (token in query param or first message)
- Track active connections per game
- Handle disconnects gracefully (30s reconnect window)
- Ping/pong for connection health

### Files to Create/Modify

- `backend/app/websocket/manager.py` - Connection manager
- `backend/app/websocket/handlers.py` - Event handlers
- `backend/app/main.py` - Add WebSocket route
- `frontend/src/lib/websocket.ts` - WebSocket client
- `frontend/src/hooks/useGameSocket.ts` - React hook for game socket

---

## Phase 5: Game Logic Updates

### Turn Validation

```python
def validate_move(game, player_id, move):
    if game.status != "active":
        raise GameNotActiveError()

    if game.turn == "white" and game.white_player_id != player_id:
        raise NotYourTurnError()

    if game.turn == "black" and game.black_player_id != player_id:
        raise NotYourTurnError()

    if not chess_service.is_legal_move(move):
        raise IllegalMoveError()
```

### Game Modes

| Mode | Description |
|------|-------------|
| `solo` | vs Stockfish (existing) |
| `private` | vs friend via link |
| `ranked` | vs random opponent, affects ELO |

### ELO Updates (Ranked Games)

After ranked game ends:
- Calculate ELO change using standard formula
- Update both players' ratings
- Update games_played count

---

## Phase 6: Frontend Updates

### New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Updated with multiplayer options |
| `/login` | Login | Auth forms |
| `/profile` | Profile | Stats, game history |
| `/play/friend` | PrivateLobby | Create/join private game |
| `/play/online` | Matchmaking | Queue for ranked game |
| `/join/:code` | JoinGame | Join via shareable link |
| `/game/:id` | Game | Updated for multiplayer |

### Updated Components

- `Game.tsx` - Handle WebSocket, show opponent info, resign/draw buttons
- `ChessBoard.tsx` - Flip board for black player
- `Header.tsx` - Show logged-in user, logout button

### New Components

- `OpponentInfo.tsx` - Display opponent name, rating, connection status
- `GameControls.tsx` - Resign, offer draw, etc.
- `MatchmakingQueue.tsx` - Queue status, cancel button
- `GameHistory.tsx` - List of past games

---

## Phase 7: Infrastructure Updates

### Environment Variables

```bash
# Backend
JWT_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
REDIS_URL=redis://localhost:6379  # For matchmaking queue (optional)

# Frontend
VITE_WS_URL=wss://chess-api.pakhunchan.com/ws
```

### AWS Updates

- ALB: Add WebSocket support (already supported)
- ECS: Ensure sticky sessions for WebSocket (or use external state)
- Optional: Add ElastiCache Redis for matchmaking queue

### CORS Updates

- Allow WebSocket upgrade requests
- Already configured for chess.pakhunchan.com

---

## Implementation Order

### Sprint 1: Foundation (3-4 days)
1. [ ] Database migrations (new tables, game table updates)
2. [ ] Player and Session models
3. [ ] Anonymous auth (auto-create player, session token)
4. [ ] Basic auth middleware

### Sprint 2: Private Games (2-3 days)
5. [ ] Create private game endpoint (generates game_code)
6. [ ] Join private game endpoint
7. [ ] Frontend: Create game flow
8. [ ] Frontend: Join game via link

### Sprint 3: WebSocket (3-4 days)
9. [ ] WebSocket connection manager
10. [ ] WebSocket authentication
11. [ ] Move events over WebSocket
12. [ ] Frontend: useGameSocket hook
13. [ ] Frontend: Real-time board updates

### Sprint 4: Full Auth (2-3 days)
14. [ ] Email/password registration & login
15. [ ] JWT token handling
16. [ ] Frontend: Login/register pages
17. [ ] Frontend: Auth context & protected routes

### Sprint 5: Matchmaking (2-3 days)
18. [ ] Matchmaking queue (in-memory or Redis)
19. [ ] ELO-based pairing
20. [ ] Frontend: Matchmaking UI
21. [ ] ELO updates after ranked games

### Sprint 6: Polish (2-3 days)
22. [ ] OAuth (Google) integration
23. [ ] Resign/draw functionality
24. [ ] Disconnect handling & reconnection
25. [ ] Time controls (optional)
26. [ ] Profile page with stats

---

## Total Estimate

| Phase | Days |
|-------|------|
| Sprint 1: Foundation | 3-4 |
| Sprint 2: Private Games | 2-3 |
| Sprint 3: WebSocket | 3-4 |
| Sprint 4: Full Auth | 2-3 |
| Sprint 5: Matchmaking | 2-3 |
| Sprint 6: Polish | 2-3 |
| **Total** | **14-20 days** |

---

## Dependencies

### Backend
```
# New packages
python-jose[cryptography]  # JWT tokens
passlib[bcrypt]            # Password hashing
python-multipart           # Form data (file uploads, OAuth)
httpx                      # OAuth HTTP client
redis                      # Matchmaking queue (optional)
```

### Frontend
```
# New packages (if needed)
None - existing stack sufficient
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket scaling with multiple ECS tasks | Use Redis pub/sub for cross-instance communication |
| Matchmaking fairness | Start with simple FIFO, add ELO matching later |
| Anonymous account abuse | Rate limiting, optional captcha |
| OAuth complexity | Start with Google only, add others later |

---

## MVP vs Full Feature

### MVP (Private Games Only)
- Anonymous auth only
- Shareable links to play with friends
- WebSocket for real-time
- **~7-10 days**

### Full Feature
- All auth options
- Matchmaking with ELO
- Time controls
- Profile & stats
- **~14-20 days**

Recommend starting with MVP, then iterating.
