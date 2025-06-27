from fastapi import FastAPI, HTTPException, Depends
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import (
    SessionLocal,
    Base,
    engine,
    Performance,
    PuzzleDB,
    PuzzleSetDB,
    puzzle_set_puzzles,
)

from .models import (
    PuzzleSet,
    Puzzle,
    MoveRequest,
    MoveResult,
    SessionSummary,
    Performance as PerformanceModel,
)

app = FastAPI(title="Woodpecker API")

# Initialize database tables
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



SESSIONS = {}
LAST_RUNS = {}

@app.get("/api/puzzle_sets", response_model=List[PuzzleSet])
def list_puzzle_sets(db: Session = Depends(get_db)):
    results = (
        db.query(
            PuzzleSetDB.id,
            PuzzleSetDB.name,
            PuzzleSetDB.description,
            func.count(puzzle_set_puzzles.c.puzzle_id).label("size"),
        )
        .outerjoin(
            puzzle_set_puzzles,
            PuzzleSetDB.id == puzzle_set_puzzles.c.puzzle_set_id,
        )
        .group_by(PuzzleSetDB.id)
        .order_by(PuzzleSetDB.id)
        .all()
    )
    return [
        PuzzleSet(
            id=r.id,
            name=r.name,
            description=r.description,
            size=r.size,
        )
        for r in results
    ]

@app.post("/api/sessions", status_code=201)
def start_session(data: dict, db: Session = Depends(get_db)):
    puzzle_set_id = data.get("puzzle_set_id")
    if not puzzle_set_id:
        raise HTTPException(status_code=400, detail="puzzle_set_id required")

    puzzle_records = (
        db.query(PuzzleDB)
        .join(puzzle_set_puzzles, PuzzleDB.id == puzzle_set_puzzles.c.puzzle_id)
        .filter(puzzle_set_puzzles.c.puzzle_set_id == puzzle_set_id)
        .order_by(PuzzleDB.id)
        .all()
    )
    if not puzzle_records:
        raise HTTPException(status_code=404, detail="puzzle set not found")

    puzzles = []
    solutions = {}
    for p in puzzle_records:
        moves = p.moves.split()
        puzzles.append(
            Puzzle(
                id=p.id,
                puzzle_set_id=puzzle_set_id,
                fen=p.fen,
                moves_count=len(moves),
            )
        )
        solutions[p.id] = moves

    session_id = f"s{len(SESSIONS)+1}"
    attempts = LAST_RUNS.get(puzzle_set_id, {}).get("attempts", 0) + 1
    SESSIONS[session_id] = {
        "index": 0,
        "score": 0,
        "move_index": 1,
        "start": datetime.utcnow(),
        "puzzle_set_id": puzzle_set_id,
        "attempts": attempts,
        "puzzles": puzzles,
        "solutions": solutions,
        "hint_used": False,
    }
    puzzle = puzzles[0]
    first_move = solutions[puzzle.id][0]
    puzzle = puzzle.copy(update={"initial_move": first_move})
    return {
        "id": session_id,
        "puzzle": puzzle,
        "score": 0,
        "elapsed_seconds": 0,
    }

@app.get("/api/sessions/{session_id}/puzzle", response_model=Puzzle | None)
def get_puzzle(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    puzzles = session["puzzles"]
    solutions = session["solutions"]
    if session["index"] >= len(puzzles):
        return None
    puzzle = puzzles[session["index"]]
    first_move = solutions[puzzle.id][0]
    session["move_index"] = 1
    return puzzle.copy(update={"initial_move": first_move})


@app.post("/api/sessions/{session_id}/move", response_model=MoveResult)
def submit_move(session_id: str, move: MoveRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    puzzles = session["puzzles"]
    solutions = session["solutions"]
    puzzle = puzzles[session["index"]]
    solution = solutions[puzzle.id]
    move_idx = session.get("move_index", 0)
    expected = solution[move_idx]

    if move.move == expected:
        move_idx += 1
        next_move = None
        if move_idx == len(solution):
            session["score"] += 2 if not session.get("hint_used") else 1
            session["index"] += 1
            session["move_index"] = 0
            session["hint_used"] = False
            puzzle_solved = True
        else:
            # autoplay opponent move
            next_move = solution[move_idx]
            move_idx += 1
            if move_idx == len(solution):
                session["score"] += 2 if not session.get("hint_used") else 1
                session["index"] += 1
                session["move_index"] = 0
                session["hint_used"] = False
                puzzle_solved = True
            else:
                session["move_index"] = move_idx
                puzzle_solved = False
        return MoveResult(correct=True, puzzle_solved=puzzle_solved, score=session["score"], next_move=next_move)
    else:
        # Wrong answer: reveal solution and move to next puzzle
        session["score"] -= 1
        session["index"] += 1
        session["move_index"] = 0
        session["hint_used"] = False
        return MoveResult(correct=False, puzzle_solved=False, score=session["score"], solution=solution)


@app.get("/api/sessions/{session_id}/hint")
def get_hint(session_id: str):
    """Return the square of the piece that should be moved next."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    puzzles = session["puzzles"]
    solutions = session["solutions"]
    if session["index"] >= len(puzzles):
        raise HTTPException(status_code=400, detail="session finished")
    puzzle = puzzles[session["index"]]
    move_idx = session.get("move_index", 0)
    solution = solutions[puzzle.id]
    if move_idx >= len(solution):
        raise HTTPException(status_code=400, detail="puzzle solved")
    session["hint_used"] = True
    expected = solution[move_idx]
    return {"square": expected[:2]}

@app.get("/api/sessions/{session_id}/summary", response_model=SessionSummary)
def summary(session_id: str, db: Session = Depends(get_db)):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    session = SESSIONS[session_id]
    elapsed = int((datetime.utcnow() - session["start"]).total_seconds())
    puzzle_set_id = session["puzzle_set_id"]
    last = LAST_RUNS.get(puzzle_set_id)
    ps = db.query(PuzzleSetDB).filter(PuzzleSetDB.id == puzzle_set_id).first()
    puzzle_set_name = ps.name if ps else str(puzzle_set_id)
    perf = Performance(
        puzzle_set=puzzle_set_name,
        score=session["score"],
        elapsed_seconds=elapsed,
    )
    db.add(perf)
    db.commit()
    db.refresh(perf)

    summary = SessionSummary(
        score=session["score"],
        elapsed_seconds=elapsed,
        attempts=session["attempts"],
        previous_score=last.get("score") if last else None,
        previous_elapsed_seconds=last.get("elapsed_seconds") if last else None,
        performance_id=perf.id,
    )
    LAST_RUNS[puzzle_set_id] = {
        "score": session["score"],
        "elapsed_seconds": elapsed,
        "attempts": session["attempts"],
    }
    return summary


@app.get("/api/performances", response_model=List[PerformanceModel])
def list_performances(db: Session = Depends(get_db)):
    records = db.query(Performance).order_by(Performance.date.desc()).all()
    return [
        PerformanceModel(
            id=r.id,
            puzzle_set=r.puzzle_set,
            score=r.score,
            elapsed_seconds=r.elapsed_seconds,
            date=r.date.isoformat(),
        )
        for r in records
    ]
