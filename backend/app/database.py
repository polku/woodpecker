import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./woodpecker.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import Column, String, Integer, DateTime, Table, ForeignKey
import uuid
from datetime import datetime

class Performance(Base):
    __tablename__ = "performances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    puzzle_set = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    elapsed_seconds = Column(Integer, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)


# Association table linking puzzles and puzzle sets
puzzle_set_puzzles = Table(
    "puzzle_set_puzzles",
    Base.metadata,
    Column("puzzle_set_id", Integer, ForeignKey("puzzle_sets.id"), primary_key=True),
    Column("puzzle_id", Integer, ForeignKey("puzzles.id"), primary_key=True),
)


class PuzzleSetDB(Base):
    __tablename__ = "puzzle_sets"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)


class PuzzleDB(Base):
    __tablename__ = "puzzles"

    id = Column(Integer, primary_key=True)
    fen = Column(String, nullable=False)
    moves = Column(String, nullable=False)
    rating = Column(Integer, nullable=False, default=0)
