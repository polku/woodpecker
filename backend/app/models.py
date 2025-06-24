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

class MoveRequest(BaseModel):
    move: str

class MoveResult(BaseModel):
    correct: bool
    puzzle_solved: bool
    score: int
    solution: Optional[List[str]] = None

class SessionSummary(BaseModel):
    score: int
    elapsed_seconds: int
