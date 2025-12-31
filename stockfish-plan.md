# Plan: Stockfish Integration with Difficulty Levels

## Overview
Replace random move AI with Stockfish chess engine, allowing players to select difficulty when creating a game.

## Difficulty Levels
| Level | Name | Stockfish Skill | ~ELO |
|-------|------|-----------------|------|
| 1 | Beginner | 1 | 800 |
| 2 | Easy | 5 | 1200 |
| 3 | Medium | 10 | 1600 |
| 4 | Hard | 15 | 2000 |
| 5 | Expert | 18 | 2500 |
| 6 | Maximum | 20 | 3500+ |

## Changes Required

### 1. Backend - Database (`backend/app/models.py`)
- Add `difficulty` column to `games` table (INTEGER, default=3 for Medium)

### 2. Backend - Schemas (`backend/app/schemas.py`)
- Add `difficulty` field to `GameResponse`
- Create `CreateGameRequest` schema with optional `difficulty` field

### 3. Backend - AI Service (`backend/app/services/ai_service.py`)
- Replace `RandomAI` with `StockfishAI` class
- Map difficulty level to Stockfish Skill Level
- Use `chess.engine` to communicate with Stockfish

### 4. Backend - API (`backend/app/main.py`)
- Update `POST /games` to accept `difficulty` in request body
- Store difficulty in game record
- Pass difficulty to AI service when making computer moves

### 5. Backend - Docker (`backend/Dockerfile`)
- Install Stockfish in the container (`apt-get install stockfish`)

### 6. Frontend - API Client (`frontend/src/lib/api.ts`)
- Update `createGame()` to accept optional difficulty parameter

### 7. Frontend - Home Page (`frontend/src/pages/Home.tsx`)
- Add difficulty selector (dropdown or buttons)
- Pass selected difficulty to `createGame()`

### 8. Frontend - Game Page (`frontend/src/pages/Game.tsx`)
- Display current game difficulty (optional, nice to have)

## File Changes Summary
```
backend/
├── Dockerfile              (add stockfish installation)
├── app/
│   ├── models.py           (add difficulty column)
│   ├── schemas.py          (add difficulty to schemas)
│   ├── main.py             (update create_game endpoint)
│   └── services/
│       └── ai_service.py   (replace RandomAI with StockfishAI)

frontend/src/
├── lib/api.ts              (update createGame)
└── pages/
    ├── Home.tsx            (add difficulty selector)
    └── Game.tsx            (show difficulty - optional)
```

## Implementation Order
1. Update Dockerfile to install Stockfish
2. Update database model with difficulty column
3. Update schemas for API request/response
4. Implement StockfishAI service
5. Update API endpoint
6. Rebuild backend container
7. Update frontend API client
8. Add difficulty selector to Home page
