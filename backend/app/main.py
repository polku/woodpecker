from fastapi import FastAPI, HTTPException
from typing import List
from .models import PuzzleSet, Puzzle, MoveRequest, MoveResult, SessionSummary

app = FastAPI(title="Woodpecker API")

# In-memory placeholders
PUZZLE_SETS = [
    PuzzleSet(id=1, name="Intro", description="Mate in one"),
]

PUZZLES = [
    Puzzle(id=42, puzzle_set_id=1, fen="7k/5K2/6Q1/8/8/8/8/8 w - - 0 1", moves_count=1),
    Puzzle(id=43, puzzle_set_id=1, fen="k7/8/8/7Q/8/8/8/K7 w - - 0 1", moves_count=1),
    Puzzle(id=44, puzzle_set_id=1, fen="6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1", moves_count=1),
    Puzzle(id=45, puzzle_set_id=1, fen="8/8/8/2k5/2P5/2K5/8/8 w - - 0 1", moves_count=1),
    Puzzle(id=46, puzzle_set_id=1, fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves_count=1),
]

SESSIONS = {}

@app.get("/api/puzzle_sets", response_model=List[PuzzleSet])
def list_puzzle_sets():
    return PUZZLE_SETS

@app.post("/api/sessions", status_code=201)
def start_session(data: dict):
    puzzle_set_id = data.get("puzzle_set_id")
    if not puzzle_set_id:
        raise HTTPException(status_code=400, detail="puzzle_set_id required")
    session_id = f"s{len(SESSIONS)+1}"
    SESSIONS[session_id] = {"index": 0, "score": 0}
    puzzle = PUZZLES[0]
    return {
        "id": session_id,
        "puzzle": puzzle,
        "score": 0,
        "elapsed_seconds": 0,
    }

@app.get("/api/sessions/{session_id}/puzzle", response_model=Puzzle)
def get_puzzle(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    return PUZZLES[SESSIONS[session_id]["index"]]

@app.post("/api/sessions/{session_id}/move", response_model=MoveResult)
def submit_move(session_id: str, move: MoveRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    # Simplified check: always correct if move is 'e2e4'
    correct = move.move == "e2e4"
    session = SESSIONS[session_id]
    if correct:
        session["score"] += 1
        session["index"] += 1
        puzzle_solved = True
    else:
        puzzle_solved = False
    return MoveResult(correct=correct, puzzle_solved=puzzle_solved, score=session["score"])

@app.get("/api/sessions/{session_id}/summary", response_model=SessionSummary)
def summary(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    return SessionSummary(score=session["score"], elapsed_seconds=0)
