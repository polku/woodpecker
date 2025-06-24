# API Schema for Woodpecker Training App

This document describes the REST API that the React frontend and FastAPI backend should use. All endpoints are prefixed with `/api`.

## Models

### PuzzleSet
- `id` (integer): unique identifier
- `name` (string): display name
- `description` (string): optional description

### Puzzle
- `id` (integer): unique identifier
- `puzzle_set_id` (integer): ID of the set it belongs to
- `fen` (string): board position in FEN notation
- `moves_count` (integer): number of moves in the solution

### Session
- `id` (string): unique session identifier
- `puzzle_set_id` (integer): puzzle set in use
- `start_time` (ISO 8601 timestamp)
- `score` (integer)
- `elapsed_seconds` (integer)

## Endpoints

### `GET /api/puzzle_sets`
Returns the list of available puzzle sets.

**Response 200**
```json
[
  {"id": 1, "name": "Intro", "description": "Mate in one"}
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
{"id": "abc123", "puzzle": {"id": 42, "fen": "...", "moves_count": 3}, "score": 0, "elapsed_seconds": 0}
```

### `GET /api/sessions/{session_id}/puzzle`
Fetch the current puzzle for the session.

**Response 200**
```json
{"id": 42, "fen": "...", "moves_count": 3}
```

### `POST /api/sessions/{session_id}/move`
Submit the next move for the current puzzle.

**Request body**
```json
{"move": "e2e4"}
```

**Response 200** (correct move)
```json
{"correct": true, "puzzle_solved": false, "score": 1}
```

**Response 200** (incorrect move)
```json
{"correct": false, "puzzle_solved": false, "score": 0, "solution": ["e2e4", "e7e5"]}
```

If `puzzle_solved` becomes `true`, the next call to `GET /api/sessions/{session_id}/puzzle` returns the next puzzle or `null` when finished.

### `GET /api/sessions/{session_id}/summary`
Return final score and timing once the session ends.

**Response 200**
```json
{"score": 7, "elapsed_seconds": 300}
```

## Notes
- All timestamps use ISO 8601 format (UTC).
- Moves are in UCI format (`e2e4`). The frontend should convert from chessboard clicks to this format.
- Authentication is not yet implemented; sessions are anonymous.
- The schema may evolve but should remain backward compatible when possible.
