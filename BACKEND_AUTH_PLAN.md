# Backend Auth Plan (Phase 2)

## Goal
Add optional Firebase JWT verification to the FastAPI backend. Auth is for persistence features, not gameplay access.

**Guest vs Signed-in:**
- **Guest**: Can play everything (single player & multiplayer), but games aren't saved to any account
- **Signed-in**: Same gameplay + games saved to account, stats tracked, game history available

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  If user is signed in:                                          │
│    → Include Authorization: Bearer <firebase-jwt> in requests   │
│  If guest:                                                      │
│    → No Authorization header                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Check for Authorization header                              │
│  2. If present:                                                 │
│     - Verify JWT with Firebase Admin SDK                        │
│     - Extract user_id (Firebase UID)                            │
│     - Create/lookup user in database                            │
│     - Associate game with user_id                               │
│  3. If absent:                                                  │
│     - Allow request (guest mode)                                │
│     - game.user_id = NULL                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Database Changes

### New Table: `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

### Modify Table: `games`
```sql
ALTER TABLE games ADD COLUMN user_id UUID REFERENCES users(id);
CREATE INDEX idx_games_user_id ON games(user_id);
```

## Backend Changes

### New Dependencies
```
# requirements.txt
firebase-admin>=6.0.0
```

### New Files

**`backend/app/services/firebase_auth.py`**
- Initialize Firebase Admin SDK
- `verify_token(token: str) -> dict` - Verify JWT, return decoded claims
- Requires `FIREBASE_SERVICE_ACCOUNT_KEY` env var (JSON key file path or content)

**How JWT Verification Works (Public Key Caching):**
```
1. JWT arrives with 'kid' (key ID) in header
2. Firebase Admin SDK checks in-memory cache for matching public key
3. If cached → verify signature locally (no network call)
4. If not cached → fetch keys from Google's endpoint, cache them
5. Keys are cached based on Cache-Control header (~6 hours)
6. Each ECS container maintains its own in-memory cache (this is fine)
```
Note: No need to implement caching ourselves - `firebase-admin` handles it automatically.
Use `firebase_admin.auth.verify_id_token(token)` which does all of this internally.

**`backend/app/dependencies.py`**
- `get_current_user_optional(authorization: str = Header(None))`
  - Returns `User` if valid token, `None` if no token
  - Raises 401 if invalid/expired token

**`backend/app/routers/users.py`** (optional)
- `GET /users/me` - Get current user profile
- `GET /users/me/games` - Get user's game history

### Modified Files

**`backend/app/models.py`**
- Add `User` SQLAlchemy model
- Add `user_id` foreign key to `Game` model

**`backend/app/schemas.py`**
- Add `UserResponse` schema
- Update `GameResponse` to include optional user info

**`backend/app/main.py`**
- Update `POST /games` to accept optional user from dependency
- Update `GET /games/{id}` to include user info if present
- Update `POST /games/{id}/move` to accept optional user

## Endpoint Auth Requirements

| Endpoint | Auth | Reason |
|----------|------|--------|
| `POST /games` | Optional | Guests can create games; signed-in users get games linked to account |
| `GET /games/{id}` | Optional | Anyone can view a game |
| `POST /games/{id}/move` | Optional | Anyone can play; game logic validates turns, not auth |
| `POST /games/{id}/join` | Optional | (Multiplayer) Anyone can join; signed-in users get game linked |
| `GET /users/me` | **Required** | Must be signed in to get profile |
| `GET /users/me/games` | **Required** | Must be signed in to see history |

**Note on multiplayer move validation:**
- Multiplayer doesn't require auth to validate moves
- Each player gets a player slot (white/black) when creating/joining
- Use session tokens or player slot identifiers to validate whose turn it is
- This is separate from Firebase auth - handled at game logic level

## Frontend Changes

### Modified Files

**`frontend/src/lib/api.ts`**
- Add `getAuthHeaders()` function that returns `{ Authorization: Bearer <token> }` if user is signed in
- Update `createGame()` to include auth headers
- Update other API calls to include auth headers

**`frontend/src/contexts/AuthContext.tsx`**
- Export `getIdToken()` function to get current Firebase ID token

## Environment Variables

### Backend (New)
```env
# Option 1: Path to service account JSON file
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/serviceAccountKey.json

# Option 2: JSON content directly (for Docker/cloud deployments)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### Get Service Account Key
1. Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file securely (DO NOT commit to git)

## Implementation Order

1. **Backend: Add User model and migration**
   - Create User model
   - Add user_id to Game model
   - Run migration

2. **Backend: Add Firebase Admin SDK**
   - Install firebase-admin
   - Create firebase_auth.py service
   - Create get_current_user_optional dependency

3. **Backend: Update endpoints**
   - Update POST /games to use optional auth
   - Update POST /games/{id}/move to use optional auth
   - Add GET /users/me endpoint (required auth)
   - Add GET /users/me/games endpoint (required auth)

4. **Frontend: Add auth headers to API calls**
   - Export getIdToken from AuthContext
   - Update api.ts to include auth headers

5. **Test end-to-end**
   - Guest can still create/play games
   - Signed-in user's games are associated with their account
   - User can view their game history

## Security Considerations

- Service account key must be kept secret (add to .gitignore)
- Validate Firebase project ID matches expected value
- Set token expiration handling (Firebase tokens expire after 1 hour)
- Rate limit authenticated endpoints to prevent abuse

## Future Enhancements

- Game history page for signed-in users
- Player stats (wins, losses, rating)
- Multiplayer matchmaking using user identity
- Social features (friends, challenges)
