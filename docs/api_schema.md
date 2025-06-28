# API Schema for Woodpecker Training App

This document describes the REST API that the React frontend and FastAPI backend should use. All endpoints are prefixed with `/api`.

## Models

### PuzzleSet
- `id` (integer): unique identifier
- `name` (string): display name
- `description` (string): optional description
- `size` (integer): number of puzzles in the set

### Puzzle
- `id` (integer): unique identifier
- `puzzle_set_id` (integer): ID of the set it belongs to
- `fen` (string): board position in FEN notation
- `moves_count` (integer): number of moves in the solution
- `initial_move` (string, optional): move automatically played before the user
  moves

### Session
- `id` (string): unique session identifier
- `puzzle_set_id` (integer): puzzle set in use
- `start_time` (ISO 8601 timestamp)
- `score` (integer)
- `elapsed_seconds` (integer)

### Performance
- `id` (string): unique identifier
- `puzzle_set` (string): name of the puzzle set
- `score` (integer)
- `elapsed_seconds` (integer)
- `date` (ISO 8601 timestamp)

## Endpoints

### `GET /api/puzzle_sets`
Returns the list of available puzzle sets.

**Response 200**
```json
[
  {"id": 1, "name": "Intro", "description": "Mate in one", "size": 10}
]
```

### `POST /api/sessions`
Start a new training session with a puzzle set.

**Request body**
```json
{"puzzle_set_id": 1}
```

**Response 201**
```json
{
  "id": "abc123",
  "puzzle": {
    "id": 42,
    "fen": "...",
    "moves_count": 3,
    "initial_move": "e7e5"
  },
  "score": 0,
  "elapsed_seconds": 0
}
```

### `GET /api/sessions/{session_id}/puzzle`
Fetch the current puzzle for the session.

**Response 200**
```json
{
  "id": 42,
  "fen": "...",
  "moves_count": 3,
  "initial_move": "e7e5"
}
```

### `POST /api/sessions/{session_id}/move`
Submit the next move for the current puzzle.

**Request body**
```json
{"move": "e2e4"}
```

**Response 200** (correct move)
```json
{"correct": true, "puzzle_solved": false, "score": 2, "next_move": "e7e5"}
```
`next_move` contains the automatically played reply when the puzzle is not yet solved.

**Response 200** (incorrect move)
```json
{"correct": false, "puzzle_solved": false, "score": -1, "solution": ["e2e4", "e7e5"]}
```

### `GET /api/sessions/{session_id}/hint`
Request the square of the piece that should be moved next. Using this endpoint
marks the hint as used for the current puzzle.

**Response 200**
```json
{"square": "e2"}
```

If `puzzle_solved` becomes `true`, the next call to `GET /api/sessions/{session_id}/puzzle` returns the next puzzle or `null` when finished.

### `GET /api/sessions/{session_id}/summary`
Return final score, elapsed time and progress information once the session ends.

**Response 200**
```json
{
  "score": 7,
  "elapsed_seconds": 300,
  "attempts": 3,
  "previous_score": 5,
  "previous_elapsed_seconds": 420,
  "performance_id": "uuid"
}
```

### `GET /api/performances`
List stored session performances ordered from newest to oldest.

**Response 200**
```json
[
  {
    "id": "uuid",
    "puzzle_set": "Intro",
    "score": 7,
    "elapsed_seconds": 300,
    "date": "2024-05-11T15:00:00Z"
  }
]
```

### `POST /api/puzzles/{puzzle_id}/rating`
Adjust the rating score of a puzzle. Positive values increase the rating while
negative values decrease it.

**Request body**
```json
{"value": 1}
```

`value` must be `1` or `-1`.

**Response 204**


## Notes
- All timestamps use ISO 8601 format (UTC).
- Moves are in UCI format (`e2e4`). The frontend should convert from chessboard clicks to this format.
- The first move in each puzzle is played automatically by the backend. The
  client should apply the `initial_move` before allowing the user to move.
- Authentication is not yet implemented; sessions are anonymous.
- The schema may evolve but should remain backward compatible when possible.
