from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


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
