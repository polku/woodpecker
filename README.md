Project to implement the woodpecker method for chess training.

General idea

- given a defined set of chess puzzles, user solve them again and again
- the goal is to solve them faster every time to enforce pattern recognition


Features to be implemented:
- choices between different sets of puzzles (some sets are thematic ex endgames)
- score (+1 for correct -1 for incorrect ) for proposed solutions
- chronometer: the goal is to maximize score and minimize time
- keep the score and time in memory to see progress
- the solution to a puzzle can contain several moves
- need a classic chess interface where user can click to set moves
 - if correct, user has positive feedback
   - if it was the last move of the solution, give user 1 point and show a success message
   - the user clicks "Next Puzzle" to continue
   - else wait until next move
- if incorrect, user has negative feedback, lose one point and can see the solution before clicking to see the next puzzle
- when the last puzzle is done, display the score summmary

That's it for now, we'll see for more features later.

## Dependency management with `uv`

This project now uses [`uv`](https://github.com/astral-sh/uv) to manage Python
dependencies. `uv` is a drop-in replacement for `pip` written in Rust that
provides much faster installs. To set up the environment:

1. [Install `uv`](https://github.com/astral-sh/uv#installation) (for example by
   running `curl -Ls https://astral.sh/uv/install.sh | sh`).
2. Create a virtual environment with `uv venv`.
3. Install the backend requirements:

   ```bash
   uv pip install -r backend/requirements.txt
   ```

With the dependencies installed you can run the backend as described in
`backend/README.md`.
