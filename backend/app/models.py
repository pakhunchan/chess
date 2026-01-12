import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=True, index=True)
    email = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    photo_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    games = relationship("Game", back_populates="user")


class Game(Base):
    __tablename__ = "games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(20), nullable=False, default="active")
    current_position = Column(Text, nullable=False)
    turn = Column(String(10), nullable=False, default="white")
    result = Column(String(20), nullable=True)
    difficulty = Column(Integer, nullable=False, default=3)  # 1-6, default Medium
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="games")
    moves = relationship("Move", back_populates="game", order_by="Move.move_number")


class Move(Base):
    __tablename__ = "moves"

    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    move_number = Column(Integer, nullable=False)
    move_input = Column(String(10), nullable=False)
    move_notation = Column(String(10), nullable=True)
    position_after = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    game = relationship("Game", back_populates="moves")
