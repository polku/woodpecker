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

If you have the full `lichess_db_puzzle.csv` dataset available you can create additional puzzle sets automatically. The helper script `build_thematic_sets.py` uses **polars** for fast CSV processing and can generate sets for any theme or opening tag present in the dataset.

```bash
python build_thematic_sets.py lichess_db_puzzle.csv --token mateIn1 --sets 3
```

The script updates `woodpecker.db` and also writes the SQL commands used to `init_thematic.sql` so that the same data can be imported later with `sqlite3 woodpecker.db < init_thematic.sql`. Additional options let you control the number of sets, the puzzles per set and filter by rating:

```bash
python build_thematic_sets.py lichess_db_puzzle.csv --token endgame --sets 2 --count 50 --min-rating 1200
```

This would create two sets of 50 endgame puzzles with a minimum rating of 1200.

By default the rows are matched against the ``Themes`` column. You can instead
match against the ``OpeningTags`` column which is present in the full dataset:

```bash
python build_thematic_sets.py lichess_db_puzzle.csv --token sicilian --column OpeningTags
```
