from uuid import UUID
from pydantic import BaseModel, Field


class CreateGameRequest(BaseModel):
    difficulty: int = Field(default=3, ge=1, le=6)  # 1-6, default Medium


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")


class MoveRequest(BaseModel):
    move: str


class MoveInfo(BaseModel):
    move_number: int
    move: str

    class Config:
        from_attributes = True


class GameResponse(BaseModel):
    game_id: UUID
    status: str
    turn: str
    result: str | None
    current_position: str
    difficulty: int
    moves: list[MoveInfo] = []

    class Config:
        from_attributes = True


class MoveResponse(BaseModel):
    status: str
    turn: str
    result: str | None
    current_position: str
    last_moves: list[str]


class ErrorResponse(BaseModel):
    detail: str


class UserResponse(BaseModel):
    id: UUID
    username: str | None
    email: str | None
    display_name: str | None
    photo_url: str | None

    class Config:
        from_attributes = True


class GameSummary(BaseModel):
    game_id: UUID
    status: str
    result: str | None
    difficulty: int
    move_count: int
    created_at: str

    class Config:
        from_attributes = True



class UserGamesResponse(BaseModel):
    games: list[GameSummary]


class TutorRequest(BaseModel):
    fen: str
    move: str
    best_move: str | None = None


class TutorResponse(BaseModel):
    explanation: str

