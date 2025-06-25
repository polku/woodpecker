from fastapi import FastAPI, HTTPException
from typing import List
from datetime import datetime
from pathlib import Path
import csv

from .models import (
    PuzzleSet,
    Puzzle,
    MoveRequest,
    MoveResult,
    SessionSummary,
)

app = FastAPI(title="Woodpecker API")

# In-memory placeholders
PUZZLE_SETS = [
    PuzzleSet(id=1, name="Intro", description="Mate in one"),
]


def load_puzzles():
    """Load puzzles from the demo.csv file."""
    puzzles = []
    solutions = {}
    csv_path = Path(__file__).resolve().parent.parent / "demo.csv"
    with csv_path.open(newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            fen = row["FEN"]
            moves = row["Moves"].split()
            puzzles.append(
                Puzzle(
                    id=idx,
                    puzzle_set_id=1,
                    fen=fen,
                    moves_count=len(moves),
                )
            )
            solutions[idx] = moves
    return puzzles, solutions





PUZZLES, PUZZLE_SOLUTIONS = load_puzzles()

SESSIONS = {}
LAST_RUNS = {}

@app.get("/api/puzzle_sets", response_model=List[PuzzleSet])
def list_puzzle_sets():
    return PUZZLE_SETS

@app.post("/api/sessions", status_code=201)
def start_session(data: dict):
    puzzle_set_id = data.get("puzzle_set_id")
    if not puzzle_set_id:
        raise HTTPException(status_code=400, detail="puzzle_set_id required")
    session_id = f"s{len(SESSIONS)+1}"
    attempts = LAST_RUNS.get(puzzle_set_id, {}).get("attempts", 0) + 1
    SESSIONS[session_id] = {
        "index": 0,
        "score": 0,
        "move_index": 1,
        "start": datetime.utcnow(),
        "puzzle_set_id": puzzle_set_id,
        "attempts": attempts,
    }
    puzzle = PUZZLES[0]
    first_move = PUZZLE_SOLUTIONS[puzzle.id][0]
    puzzle = puzzle.copy(update={"initial_move": first_move})
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
    session = SESSIONS[session_id]
    if session["index"] >= len(PUZZLES):
        return None
    puzzle = PUZZLES[session["index"]]
    first_move = PUZZLE_SOLUTIONS[puzzle.id][0]
    session["move_index"] = 1
    return puzzle.copy(update={"initial_move": first_move})


@app.post("/api/sessions/{session_id}/move", response_model=MoveResult)
def submit_move(session_id: str, move: MoveRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    puzzle = PUZZLES[session["index"]]
    solution = PUZZLE_SOLUTIONS[puzzle.id]
    move_idx = session.get("move_index", 0)
    expected = solution[move_idx]

    if move.move == expected:
        move_idx += 1
        next_move = None
        if move_idx == len(solution):
            session["score"] += 1
            session["index"] += 1
            session["move_index"] = 0
            puzzle_solved = True
        else:
            # autoplay opponent move
            next_move = solution[move_idx]
            move_idx += 1
            if move_idx == len(solution):
                session["score"] += 1
                session["index"] += 1
                session["move_index"] = 0
                puzzle_solved = True
            else:
                session["move_index"] = move_idx
                puzzle_solved = False
        return MoveResult(correct=True, puzzle_solved=puzzle_solved, score=session["score"], next_move=next_move)
    else:
        # Wrong answer: reveal solution and move to next puzzle
        session["index"] += 1
        session["move_index"] = 0
        return MoveResult(correct=False, puzzle_solved=False, score=session["score"], solution=solution)

@app.get("/api/sessions/{session_id}/summary", response_model=SessionSummary)
def summary(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    elapsed = int((datetime.utcnow() - session["start"]).total_seconds())
    puzzle_set_id = session["puzzle_set_id"]
    last = LAST_RUNS.get(puzzle_set_id)
    summary = SessionSummary(
        score=session["score"],
        elapsed_seconds=elapsed,
        attempts=session["attempts"],
        previous_score=last.get("score") if last else None,
        previous_elapsed_seconds=last.get("elapsed_seconds") if last else None,
    )
    LAST_RUNS[puzzle_set_id] = {
        "score": session["score"],
        "elapsed_seconds": elapsed,
        "attempts": session["attempts"],
    }
    return summary
