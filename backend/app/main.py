from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db, engine, Base
from .models import Game, Move
from .schemas import GameResponse, MoveRequest, MoveResponse, MoveInfo
from .services.chess_service import ChessService, STARTING_FEN
from .services.ai_service import RandomAI

app = FastAPI(title="Chess API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = RandomAI()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.post("/games", response_model=GameResponse, status_code=201)
def create_game(db: Session = Depends(get_db)):
    game = Game(
        current_position=STARTING_FEN,
        turn="white",
        status="active",
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
    computer_move_uci = ai.select_move(chess_svc)
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
