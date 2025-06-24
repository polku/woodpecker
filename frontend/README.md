# Frontend

This directory contains the React frontend for the Woodpecker training app.

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server (assumes the backend is running on `localhost:8000`):

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to the backend.

## Features

- Select a puzzle set and start a training session
- Display puzzles on an interactive chessboard (`react-chessboard`)
- Keep track of score and elapsed time
- Submit moves to the backend and receive immediate feedback
- Show the final summary when the session ends

Refer to `../docs/api_schema.md` for API details.
