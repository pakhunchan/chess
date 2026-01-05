from uuid import UUID
from pydantic import BaseModel, Field


class CreateGameRequest(BaseModel):
    difficulty: int = Field(default=3, ge=1, le=6)  # 1-6, default Medium


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
