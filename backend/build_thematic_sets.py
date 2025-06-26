#!/usr/bin/env python3
"""Generate thematic puzzle sets from the lichess database CSV.

This script parses ``lichess_db_puzzle.csv`` (same layout as ``demo.csv``)
and creates several puzzle sets of 100 puzzles each in ``woodpecker.db``.
The selected themes are:
- Mate in 1
- Mate in 2
- Mate in 3
- Endgames
- Fork tactics
- Discovered attacks

Running the script also outputs an SQL file containing the corresponding
INSERT statements so the sets can be recreated later.
"""

import argparse
import sqlite3
from typing import Dict, List, Optional

import polars as pl

THEME_GROUPS: Dict[str, List[str]] = {
    "Mate in 1": ["mateIn1"],
    "Mate in 2": ["mateIn2"],
    "Mate in 3": ["mateIn3"],
    "Endgames": ["endgame"],
    "Fork tactics": ["fork"],
    "Discovered attacks": ["discoveredAttack"],
}


def parse_csv(
    csv_path: str,
    groups: Dict[str, List[str]],
    count: int = 100,
    min_rating: Optional[int] = None,
    max_rating: Optional[int] = None,
) -> Dict[str, List[dict]]:
    """Return ``count`` puzzles for each theme group using polars."""
    df = pl.read_csv(csv_path)

    if min_rating is not None:
        df = df.filter(pl.col("Rating") >= min_rating)
    if max_rating is not None:
        df = df.filter(pl.col("Rating") <= max_rating)

    results: Dict[str, List[dict]] = {}
    for name, required in groups.items():
        mask = pl.lit(True)
        for tag in required:
            mask &= pl.col("Themes").str.contains(tag)
        subset = df.filter(mask).head(count)
        results[name] = subset.to_dicts()
    return results


def insert_puzzles(db: sqlite3.Connection, sets: Dict[str, List[dict]]) -> List[str]:
    """Insert puzzles into the database and return SQL statements."""
    sql: List[str] = []
    cur = db.cursor()
    cur.execute("SELECT COALESCE(MAX(id), 0) FROM puzzle_sets")
    next_set_id = cur.fetchone()[0] + 1
    cur.execute("SELECT COALESCE(MAX(id), 0) FROM puzzles")
    next_puzzle_id = cur.fetchone()[0] + 1

    for name, puzzles in sets.items():
        set_id = next_set_id
        next_set_id += 1
        desc = f"Auto-generated set for {name.lower()}"
        cur.execute(
            "INSERT INTO puzzle_sets (id, name, description) VALUES (?, ?, ?)",
            (set_id, name, desc),
        )
        sql.append(
            f"INSERT INTO puzzle_sets (id, name, description) VALUES ({set_id}, "
            f"'{name.replace("'", "''")}', '{desc.replace("'", "''")}');"
        )
        for row in puzzles:
            pid = next_puzzle_id
            next_puzzle_id += 1
            fen = row["FEN"]
            moves = row["Moves"]
            cur.execute(
                "INSERT INTO puzzles (id, fen, moves) VALUES (?, ?, ?)",
                (pid, fen, moves),
            )
            sql.append(
                f"INSERT INTO puzzles (id, fen, moves) VALUES ({pid}, "
                f"'{fen.replace("'", "''")}', '{moves}');"
            )
            cur.execute(
                "INSERT INTO puzzle_set_puzzles (puzzle_set_id, puzzle_id) VALUES (?, ?)",
                (set_id, pid),
            )
            sql.append(
                f"INSERT INTO puzzle_set_puzzles (puzzle_set_id, puzzle_id) VALUES ({set_id}, {pid});"
            )
    db.commit()
    return sql


def main() -> None:
    parser = argparse.ArgumentParser(description="Build thematic puzzle sets")
    parser.add_argument("csv", help="Path to lichess_db_puzzle.csv")
    parser.add_argument(
        "--db",
        default="woodpecker.db",
        help="SQLite database file (default: woodpecker.db)",
    )
    parser.add_argument(
        "--sql",
        default="init_thematic.sql",
        help="Output SQL file with INSERT statements",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=100,
        help="Number of puzzles per set (default: 100)",
    )
    parser.add_argument(
        "--min-rating",
        type=int,
        help="Minimum puzzle rating",
    )
    parser.add_argument(
        "--max-rating",
        type=int,
        help="Maximum puzzle rating",
    )
    args = parser.parse_args()

    puzzles = parse_csv(
        args.csv,
        THEME_GROUPS,
        count=args.count,
        min_rating=args.min_rating,
        max_rating=args.max_rating,
    )

    with sqlite3.connect(args.db) as db:
        statements = insert_puzzles(db, puzzles)

    with open(args.sql, "w", encoding="utf-8") as f:
        for stmt in statements:
            f.write(stmt + "\n")

    print(f"Added {len(THEME_GROUPS)} puzzle sets to {args.db}.")
    print(f"SQL statements written to {args.sql}.")


if __name__ == "__main__":
    main()
