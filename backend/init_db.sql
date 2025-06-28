DROP TABLE IF EXISTS performances;
DROP TABLE IF EXISTS puzzle_set_puzzles;
DROP TABLE IF EXISTS puzzles;
DROP TABLE IF EXISTS puzzle_sets;

CREATE TABLE puzzle_sets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE puzzles (
    id INTEGER PRIMARY KEY,
    fen TEXT NOT NULL,
    moves TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE puzzle_set_puzzles (
    puzzle_set_id INTEGER NOT NULL,
    puzzle_id INTEGER NOT NULL,
    PRIMARY KEY (puzzle_set_id, puzzle_id),
    FOREIGN KEY (puzzle_set_id) REFERENCES puzzle_sets(id),
    FOREIGN KEY (puzzle_id) REFERENCES puzzles(id)
);

CREATE TABLE performances (
    id TEXT PRIMARY KEY,
    puzzle_set TEXT NOT NULL,
    score INTEGER NOT NULL,
    elapsed_seconds INTEGER NOT NULL,
    date TEXT NOT NULL
);

INSERT INTO puzzle_sets (id, name, description) VALUES
(1, 'Intro', 'Mate in one');

INSERT INTO puzzles (id, fen, moves, rating) VALUES
(1, 'r5r1/pp2kp2/2p5/3pQ3/3P4/2NB4/PPP2q2/1K6 b - - 1 28', 'e7d7 d3f5 f2f5 e5f5', 0),
(2, '8/5k2/1P4R1/6PK/1r6/8/8/8 w - - 1 58', 'h5h6 b4h4', 0),
(3, '3r4/p5k1/1p1qprnp/1Q1pN1p1/3P1pP1/1PP5/P5PP/4RRK1 b - - 3 29', 'g6e5 d4e5 d6c5 b5c5 b6c5 e5f6', 0),
(4, '6k1/3R3p/1p5q/3P4/3QP1pN/6P1/PPr3B1/5rK1 w - - 0 25', 'g1f1 h6c1 d4d1 c1d1', 0),
(5, 'r5k1/1p1rqpp1/p3pnp1/2PN4/8/1Q5P/PP3PP1/3RR1K1 b - - 0 24', 'e7c5 d5f6 g7f6 d1d7', 0),
(6, '8/6pk/7p/Q7/6P1/3q3K/1P5P/8 w - - 1 45', 'h3h4 g7g5 a5g5 h6g5', 0),
(7, '8/2p1k3/6p1/1p1P1p2/1P3P2/3K2Pp/7P/8 b - - 1 43', 'e7d6 d3d4 g6g5 f4g5', 0),
(8, '8/p7/2R3p1/4Nnk1/2P4p/7K/Pr6/8 b - - 3 50', 'g5f4 e5d3 f4g5 d3b2', 0),
(9, 'r1b1k1nr/1pp2p2/p7/1B1q3p/6p1/4PP2/PPPQ1P2/2KR3R b kq - 1 17', 'd5b5 d2d8', 0);

INSERT INTO puzzle_set_puzzles (puzzle_set_id, puzzle_id) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9);
