# Backend

This directory contains the FastAPI application. It uses SQLite as a simple storage backend.

Run the development server with:

```bash
# install dependencies using uv
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

To rebuild the database from scratch you can run the SQL script:

```bash
sqlite3 woodpecker.db < init_db.sql
```

The API schema is documented in `../docs/api_schema.md`.

## Generating thematic puzzle sets

If you have the full `lichess_db_puzzle.csv` dataset available you can create additional puzzle sets automatically. The helper script `build_thematic_sets.py` uses **polars** for fast CSV processing and selects puzzles for a few common themes (mate in 1/2/3, endgames, fork tactics and discovered attacks).

```bash
python build_thematic_sets.py lichess_db_puzzle.csv --db woodpecker.db --sql init_thematic.sql
```

The script updates `woodpecker.db` and also writes the SQL commands used to `init_thematic.sql` so that the same data can be imported later with `sqlite3 woodpecker.db < init_thematic.sql`. Additional options let you control the number of puzzles per set and filter by rating:

```bash
python build_thematic_sets.py lichess_db_puzzle.csv --count 50 --min-rating 1200
```

This would create sets of 50 puzzles each with a minimum rating of 1200.
