from pydantic import BaseModel
from typing import List, Optional

class PuzzleSet(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

class Puzzle(BaseModel):
    id: int
    puzzle_set_id: int
    fen: str
    moves_count: int
    initial_move: Optional[str] = None



class MoveRequest(BaseModel):
    move: str

class MoveResult(BaseModel):
    correct: bool
    puzzle_solved: bool
    score: int
    next_move: Optional[str] = None
    solution: Optional[List[str]] = None

class Performance(BaseModel):
    id: str
    puzzle_set: str
    score: int
    elapsed_seconds: int
    date: str

class SessionSummary(BaseModel):
    score: int
    elapsed_seconds: int
    attempts: int
    previous_score: Optional[int] = None
    previous_elapsed_seconds: Optional[int] = None
    performance_id: str
