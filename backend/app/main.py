# Chess Backend (Triggered redeploy 2026-01-19)
import os
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db, engine, Base
from .models import Game, Move, User
from .schemas import CreateGameRequest, GameResponse, MoveRequest, MoveResponse, MoveInfo, UserResponse, GameSummary, UserGamesResponse
from .services.chess_service import ChessService, STARTING_FEN
from .services.ai_service import StockfishAI
from .dependencies import get_current_user_optional, get_current_user_required

from .routers import auth

app = FastAPI(title="Chess API", version="1.0.0")

app.include_router(auth.router)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = StockfishAI()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.post("/games", response_model=GameResponse, status_code=201)
def create_game(
    request: CreateGameRequest = CreateGameRequest(),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    game = Game(
        current_position=STARTING_FEN,
        turn="white",
        status="active",
        difficulty=request.difficulty,
        user_id=current_user.id if current_user else None,
    )
    db.add(game)
    db.commit()
    db.refresh(game)

    return GameResponse(
        game_id=game.id,
        status=game.status,
        turn=game.turn,
        result=game.result,
        current_position=game.current_position,
        difficulty=game.difficulty,
        moves=[],
    )


@app.get("/games/{game_id}", response_model=GameResponse)
def get_game(game_id: UUID, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    moves = [
        MoveInfo(move_number=m.move_number, move=m.move_input)
        for m in game.moves
    ]

    return GameResponse(
        game_id=game.id,
        status=game.status,
        turn=game.turn,
        result=game.result,
        current_position=game.current_position,
        difficulty=game.difficulty,
        moves=moves,
    )


@app.post("/games/{game_id}/move", response_model=MoveResponse)
def submit_move(game_id: UUID, move_req: MoveRequest, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.status == "finished":
        raise HTTPException(status_code=409, detail="Game is already finished")

    chess_svc = ChessService(game.current_position)

    if not chess_svc.is_legal_move(move_req.move):
        raise HTTPException(status_code=422, detail="Illegal move")

    last_moves = []

    # Apply human move
    move_number = len(game.moves) + 1
    notation = chess_svc.make_move(move_req.move)

    human_move = Move(
        game_id=game.id,
        move_number=move_number,
        move_input=move_req.move,
        move_notation=notation,
        position_after=chess_svc.fen,
    )
    db.add(human_move)
    last_moves.append(move_req.move)

    game.current_position = chess_svc.fen
    game.turn = chess_svc.turn

    # Check for game end after human move
    if chess_svc.is_game_over():
        game.status = "finished"
        game.result = chess_svc.get_result()
        db.commit()
        return MoveResponse(
            status=game.status,
            turn=game.turn,
            result=game.result,
            current_position=game.current_position,
            last_moves=last_moves,
        )

    # Computer move
    computer_move_uci = ai.select_move(chess_svc.fen, game.difficulty)
    if computer_move_uci:
        move_number += 1
        notation = chess_svc.make_move(computer_move_uci)

        computer_move = Move(
            game_id=game.id,
            move_number=move_number,
            move_input=computer_move_uci,
            move_notation=notation,
            position_after=chess_svc.fen,
        )
        db.add(computer_move)
        last_moves.append(computer_move_uci)

        game.current_position = chess_svc.fen
        game.turn = chess_svc.turn

        if chess_svc.is_game_over():
            game.status = "finished"
            game.result = chess_svc.get_result()

    db.commit()

    return MoveResponse(
        status=game.status,
        turn=game.turn,
        result=game.result,
        current_position=game.current_position,
        last_moves=last_moves,
    )


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/users/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user_required),
):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        display_name=current_user.display_name,
        photo_url=current_user.photo_url,
    )


@app.get("/users/me/games", response_model=UserGamesResponse)
def get_current_user_games(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    games = db.query(Game).filter(Game.user_id == current_user.id).order_by(Game.created_at.desc()).all()

    game_summaries = [
        GameSummary(
            game_id=game.id,
            status=game.status,
            result=game.result,
            difficulty=game.difficulty,
            move_count=len(game.moves),
            created_at=game.created_at.isoformat(),
        )
        for game in games
    ]

    return UserGamesResponse(games=game_summaries)
