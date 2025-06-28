#!/usr/bin/env python3
"""Generate themed puzzle sets from ``lichess_db_puzzle.csv``.

The script filters the dataset by a single theme or opening tag and builds a
number of puzzle sets from those rows. Each set contains a fixed number of
puzzles and the data is inserted into ``woodpecker.db``. An accompanying SQL
file with the ``INSERT`` statements is also written so the data can be imported
later.
"""

import argparse
import sqlite3
from typing import Any

import polars as pl


def parse_csv(
    csv_path: str,
    token: str,
    *,
    num_sets: int,
    count: int = 100,
    min_rating: int | None = None,
    max_rating: int | None = None,
    column: str = "Themes",
) -> dict[str, list[dict[str, Any]]]:
    """Return ``num_sets`` lists of puzzles filtered by ``token``."""
    df = pl.read_csv(csv_path)

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in CSV")

    if min_rating is not None:
        df = df.filter(pl.col("Rating") >= min_rating)
    if max_rating is not None:
        df = df.filter(pl.col("Rating") <= max_rating)

    if column == "OpeningTags":
        mask = (
            pl.col(column)
            .fill_null("")
            .str.split(" ")
            .list.contains(token)
        )
    else:
        mask = pl.col(column).str.contains(token)

    subset = df.filter(mask)

    results: dict[str, list[dict[str, Any]]] = {}
    for i in range(num_sets):
        name = f"{token} #{i + 1}"
        results[name] = subset.slice(i * count, count).to_dicts()
    return results


def insert_puzzles(db: sqlite3.Connection, sets: dict[str, list[dict[str, Any]]]) -> list[str]:
    """Insert puzzles into the database and return SQL statements."""
    sql: list[str] = []
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
                "INSERT INTO puzzles (id, fen, moves, rating) VALUES (?, ?, ?, 0)",
                (pid, fen, moves),
            )
            sql.append(
                f"INSERT INTO puzzles (id, fen, moves, rating) VALUES ({pid}, "
                f"'{fen.replace("'", "''")}', '{moves}', 0);"
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
        "--token",
        required=True,
        help="Theme or opening tag used to select puzzles",
    )
    parser.add_argument(
        "--sets",
        type=int,
        default=1,
        help="Number of puzzle sets to generate (default: 1)",
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
    parser.add_argument(
        "--column",
        choices=["Themes", "OpeningTags"],
        default="Themes",
        help="CSV column used to build sets (default: Themes)",
    )
    args = parser.parse_args()

    puzzles = parse_csv(
        args.csv,
        args.token,
        num_sets=args.sets,
        count=args.count,
        min_rating=args.min_rating,
        max_rating=args.max_rating,
        column=args.column,
    )

    with sqlite3.connect(args.db) as db:
        statements = insert_puzzles(db, puzzles)

    with open(args.sql, "w", encoding="utf-8") as f:
        for stmt in statements:
            f.write(stmt + "\n")

    print(f"Added {args.sets} puzzle sets to {args.db}.")
    print(f"SQL statements written to {args.sql}.")


if __name__ == "__main__":
    main()
