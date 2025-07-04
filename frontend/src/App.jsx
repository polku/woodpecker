import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function ArrowOverlay({ move, boardWidth, orientation }) {
  if (!move) return null;
  const squareSize = boardWidth / 8;
  const fromFile = move.slice(0, 1).charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRank = parseInt(move[1], 10) - 1;
  const toFile = move.slice(2, 3).charCodeAt(0) - 'a'.charCodeAt(0);
  const toRank = parseInt(move[3], 10) - 1;
  const isWhite = orientation === 'white';
  const fileToX = f =>
    isWhite ? (f + 0.5) * squareSize : boardWidth - (f + 0.5) * squareSize;
  const rankToY = r =>
    isWhite ? boardWidth - (r + 0.5) * squareSize : (r + 0.5) * squareSize;
  const x1 = fileToX(fromFile);
  const y1 = rankToY(fromRank);
  const x2 = fileToX(toFile);
  const y2 = rankToY(toRank);
  return (
    <svg
      width={boardWidth}
      height={boardWidth}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="red" strokeWidth="4" markerEnd="url(#arrowhead)" />
    </svg>
  );
}

function App() {
  const [puzzleSets, setPuzzleSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [session, setSession] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [chess, setChess] = useState(new Chess());
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [boardWidth, setBoardWidth] = useState(Math.min(480, window.innerWidth - 20));
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [showSolution, setShowSolution] = useState(false);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [incorrect, setIncorrect] = useState(false);
  const [setSize, setSetSize] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(1);
  const [hintSquare, setHintSquare] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [highlightSquares, setHighlightSquares] = useState([]);
  const progressPercent = setSize > 0 ? ((puzzleIndex - 1) / setSize) * 100 : 0;

  // After loading a puzzle we automatically play the first move from the
  // solution. Orientation should therefore be for the side that moves second.
  const orientationFromFen = fen =>
    fen.split(' ')[1] === 'w' ? 'black' : 'white';

  const puzzleStartFen = pz => {
    if (!pz) return '';
    if (!pz.initial_move) return pz.fen;
    const c = new Chess(pz.fen);
    c.move(pz.initial_move);
    return c.fen();
  };

  useEffect(() => {
    const handleResize = () => {
      setBoardWidth(Math.min(480, window.innerWidth - 20));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch puzzle sets on load
  useEffect(() => {
    axios.get('/api/puzzle_sets').then(r => setPuzzleSets(r.data));
  }, []);

  // Timer
  useEffect(() => {
    if (session && !timerId) {
      const id = setInterval(() => setElapsed(e => e + 1), 1000);
      setTimerId(id);
    }
    return () => timerId && clearInterval(timerId);
  }, [session, timerId]);

  // Fetch past performances on load and whenever the summary changes
  useEffect(() => {
    axios.get('/api/performances').then(r => setPerformances(r.data));
  }, [summary]);

  const startSession = async () => {
    const res = await axios.post('/api/sessions', { puzzle_set_id: parseInt(selectedSet) });
    const currentSet = puzzleSets.find(ps => ps.id === parseInt(selectedSet));
    if (currentSet && currentSet.size) {
      setSetSize(currentSet.size);
    } else {
      setSetSize(0);
    }
    setPuzzleIndex(1);
    setSession(res.data.id);
    setPuzzle(res.data.puzzle);
    setScore(res.data.score);
    setElapsed(res.data.elapsed_seconds);
    const baseFen = res.data.puzzle.fen;
    const c = new Chess(baseFen);
    setChess(c);
    setBoardOrientation(orientationFromFen(baseFen));
    setPuzzleSolved(false);
    setLastMove(null);
    setIncorrect(false);
    setHighlightSquares([]);
    if (res.data.puzzle.initial_move) {
      const moveStr = res.data.puzzle.initial_move;
      setTimeout(() => {
        const c2 = new Chess(baseFen);
        c2.move(moveStr);
        setChess(c2);
        setLastMove({ from: moveStr.slice(0, 2), to: moveStr.slice(2, 4) });
      }, 500);
    }
  };

  const fetchNextPuzzle = async () => {
    setPuzzleSolved(false);
    setIncorrect(false);
    setHintSquare(null);
    setHintUsed(false);
    setHighlightSquares([]);
    const res = await axios.get(`/api/sessions/${session}/puzzle`);
    if (res.data) {
      setPuzzleIndex(i => i + 1);
      setPuzzle(res.data);
      const baseFen = res.data.fen;
      const c = new Chess(baseFen);
      setChess(c);
      setBoardOrientation(orientationFromFen(baseFen));
      setShowSolution(false);
      setSolutionMoves([]);
      setSolutionIndex(0);
      setLastMove(null);
      if (res.data.initial_move) {
        const moveStr = res.data.initial_move;
        setTimeout(() => {
          const c2 = new Chess(baseFen);
          c2.move(moveStr);
          setChess(c2);
          setLastMove({ from: moveStr.slice(0, 2), to: moveStr.slice(2, 4) });
        }, 500);
      }
      } else {
        const summaryRes = await axios.get(`/api/sessions/${session}/summary`);
        setSummary(summaryRes.data);
        const perfRes = await axios.get('/api/performances');
        setPerformances(perfRes.data);
        clearInterval(timerId);
      }
  };

  const ratePuzzle = async value => {
    if (!puzzle) return;
    await axios.post(`/api/puzzles/${puzzle.id}/rating`, { value });
    await fetchNextPuzzle();
  };

  const stepForward = () => {
    if (solutionIndex >= solutionMoves.length) return;
    const c = new Chess(chess.fen());
    c.move(solutionMoves[solutionIndex]);
    setChess(c);
    setLastMove({
      from: solutionMoves[solutionIndex].slice(0, 2),
      to: solutionMoves[solutionIndex].slice(2, 4)
    });
    setSolutionIndex(solutionIndex + 1);
  };

  const stepBackward = () => {
    if (solutionIndex === 0) return;
    const c = new Chess(puzzleStartFen(puzzle));
    for (let i = 0; i < solutionIndex - 1; i++) {
      c.move(solutionMoves[i]);
    }
    setChess(c);
    const newIndex = solutionIndex - 1;
    if (newIndex > 0) {
      const mv = solutionMoves[newIndex - 1];
      setLastMove({ from: mv.slice(0, 2), to: mv.slice(2, 4) });
    } else if (puzzle.initial_move) {
      setLastMove({
        from: puzzle.initial_move.slice(0, 2),
        to: puzzle.initial_move.slice(2, 4)
      });
    } else {
      setLastMove(null);
    }
    setSolutionIndex(newIndex);
  };

  const requestHint = async () => {
    if (hintUsed) return;
    const res = await axios.get(`/api/sessions/${session}/hint`);
    setHintSquare(res.data.square);
    setHintUsed(true);
  };

  const onSquareRightClick = square => {
    setHighlightSquares(sqs =>
      sqs.includes(square) ? sqs.filter(s => s !== square) : [...sqs, square]
    );
  };

  useEffect(() => {
    const handleKey = e => {
      if (!showSolution) return;
      if (e.key === 'ArrowRight') stepForward();
      if (e.key === 'ArrowLeft') stepBackward();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSolution, solutionIndex, solutionMoves, chess, puzzle]);

  useEffect(() => {
    const handleEnter = e => {
      if (e.key === "Enter" && (puzzleSolved || showSolution)) {
        fetchNextPuzzle();
      }
    };
    window.addEventListener("keydown", handleEnter);
    return () => window.removeEventListener("keydown", handleEnter);
  }, [puzzleSolved, showSolution]);

  const onDrop = async (sourceSquare, targetSquare, piece) => {
    // Attempt the move, auto-promoting to a queen if necessary. The returned
    // object will contain the promotion piece so we can send the full move
    // (including promotion) to the backend.
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false;
    setChess(new Chess(chess.fen()));
    setLastMove({ from: sourceSquare, to: targetSquare });
    setHintSquare(null);

    const promotion = move.promotion ? move.promotion : '';
    const res = await axios.post(`/api/sessions/${session}/move`, { move: `${sourceSquare}${targetSquare}${promotion}` });
    setScore(res.data.score);

    if (!res.data.correct) {
      setIncorrect(true);
      if (res.data.solution) {
        setShowSolution(true);
        let moves = res.data.solution;
        if (puzzle.initial_move && moves[0] === puzzle.initial_move) {
          moves = moves.slice(1);
        }
        setSolutionMoves(moves);
        setSolutionIndex(0);
        const startFen = puzzleStartFen(puzzle);
        setChess(new Chess(startFen));
        if (puzzle.initial_move) {
          setLastMove({
            from: puzzle.initial_move.slice(0, 2),
            to: puzzle.initial_move.slice(2, 4)
          });
        } else {
          setLastMove(null);
        }
      } else {
        await fetchNextPuzzle();
      }
      return true;
    }

    setIncorrect(false);

    if (res.data.next_move) {
      const c = new Chess(chess.fen());
      c.move(res.data.next_move);
      setChess(c);
      setLastMove({ from: res.data.next_move.slice(0, 2), to: res.data.next_move.slice(2, 4) });
    }

    if (res.data.puzzle_solved) {
      setPuzzleSolved(true);
    }

    return true;
  };

  if (summary) {
    const scoreDiff =
      summary.previous_score !== null && summary.previous_score !== undefined
        ? summary.score - summary.previous_score
        : null;
    const timeDiff =
      summary.previous_elapsed_seconds !== null &&
      summary.previous_elapsed_seconds !== undefined
        ? summary.previous_elapsed_seconds - summary.elapsed_seconds
        : null;
      return (
        <div style={{ padding: '1rem' }}>
          <h2>Session Summary</h2>
          <p>Attempt: {summary.attempts}</p>
          <p>Score: {summary.score}</p>
          <p>Time: {formatDuration(summary.elapsed_seconds)}</p>
          {summary.previous_score != null && (
            <p>
              Previous score: {summary.previous_score} ({scoreDiff >= 0 ? '+' : ''}
              {scoreDiff})
            </p>
          )}
          {summary.previous_elapsed_seconds != null && (
            <p>
              Previous time: {formatDuration(summary.previous_elapsed_seconds)} (
              {timeDiff >= 0 ? '-' : '+'}
              {formatDuration(Math.abs(timeDiff))})
            </p>
          )}
          {performances.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Past Performances</h3>
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Set</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {performances.map(p => (
                    <tr
                      key={p.id}
                      style={p.id === summary.performance_id ? { fontWeight: 'bold' } : {}}
                    >
                      <td>{new Date(p.date).toISOString()}</td>
                      <td>{p.puzzle_set}</td>
                      <td>{p.score}</td>
                      <td>{formatDuration(p.elapsed_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
  }

  if (!session) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Woodpecker Training</h1>
        <select value={selectedSet} onChange={e => setSelectedSet(e.target.value)}>
          <option value="">Select puzzle set</option>
          {puzzleSets.map(ps => (
            <option key={ps.id} value={ps.id}>{ps.name}</option>
          ))}
        </select>
        <button onClick={startSession} disabled={!selectedSet}>Start</button>
        {performances.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Past Performances</h3>
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Set</th>
                  <th>Score</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {performances.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toISOString()}</td>
                    <td>{p.puzzle_set}</td>
                    <td>{p.score}</td>
                    <td>{formatDuration(p.elapsed_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex' }}>
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <span>Score: {score}</span> | <span>Time: {formatDuration(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', width: boardWidth }}>
            <Chessboard
              boardWidth={boardWidth}
              position={chess.fen()}
              boardOrientation={boardOrientation}
              onPieceDrop={showSolution || puzzleSolved ? undefined : onDrop}
              arePiecesDraggable={!showSolution && !puzzleSolved}
              customSquareStyles={{
                ...(lastMove
                  ? {
                      [lastMove.from]: {
                        boxShadow: 'inset 0 0 0 4px rgba(0,255,0,0.6)'
                      },
                      [lastMove.to]: {
                        boxShadow: 'inset 0 0 0 4px rgba(0,255,0,0.6)'
                      }
                    }
                  : {}),
                ...(hintSquare
                  ? {
                      [hintSquare]: {
                        boxShadow: 'inset 0 0 0 4px rgba(0,0,255,0.6)'
                      }
                    }
                  : {}),
                ...highlightSquares.reduce(
                  (acc, sq) => ({
                    ...acc,
                    [sq]: {
                      backgroundColor: 'rgba(255,165,0,0.4)',
                      boxShadow: 'inset 0 0 0 2px rgba(255,165,0,0.7)'
                    }
                  }),
                  {}
                )
              }}
              onSquareRightClick={onSquareRightClick}
            />
            {showSolution && (
              <ArrowOverlay
                move={solutionIndex < solutionMoves.length ? solutionMoves[solutionIndex] : null}
                boardWidth={boardWidth}
                orientation={boardOrientation}
              />
            )}
            <div style={{ height: '4px', width: '100%', backgroundColor: '#eee', marginTop: '4px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: 'green',
                  transition: 'width 0.3s'
                }}
              ></div>
            </div>
          </div>
          <div
            style={{
              marginLeft: '1rem',
              marginTop: '-1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: boardWidth
            }}
          >
            <div
              style={{
                backgroundColor: '#333',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: chess.turn() === 'w' ? '#fff' : '#000',
                  border: '1px solid #eee',
                  marginRight: '0.5rem'
                }}
              ></div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {chess.turn() === 'w' ? 'White' : 'Black'} to move
              </div>
            </div>
            <button
              onClick={requestHint}
              disabled={hintUsed || showSolution || puzzleSolved}
              style={{ marginTop: '0.5rem' }}
            >
              Hint
            </button>
            {puzzleSolved && !showSolution && (
              <div style={{ marginTop: '0.5rem', color: 'green', fontWeight: 'bold' }}>
                Correct!
              </div>
            )}
            {showSolution && (
              <>
                {incorrect && (
                  <div style={{ marginTop: '0.5rem', color: 'red', fontWeight: 'bold' }}>
                    Incorrect!
                  </div>
                )}
                <button onClick={stepBackward} disabled={solutionIndex === 0}>{'<'}</button>
                <div style={{ margin: '0.5rem 0' }}>
                  {solutionIndex}/{solutionMoves.length}
                </div>
                <button onClick={stepForward} disabled={solutionIndex === solutionMoves.length}>{'>'}</button>
              </>
            )}
            {(puzzleSolved || showSolution) && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '80%'
                }}
              >
                <button
                  onClick={fetchNextPuzzle}
                  style={{
                    marginBottom: '0.5rem',
                    width: '100%',
                    backgroundColor: '#87cefa',
                    color: 'white',
                    fontSize: '1.1rem',
                    padding: '1rem 0.5rem'
                  }}
                >
                  Next Puzzle
                </button>
                <div style={{ display: 'flex', width: '100%' }}>
                  <button
                    onClick={() => ratePuzzle(1)}
                    style={{ flex: 1, backgroundColor: '#90ee90', color: 'black', padding: '1rem 0.5rem' }}
                  >
                    Like
                  </button>
                  <button
                    onClick={() => ratePuzzle(-1)}
                    style={{
                      flex: 1,
                      marginLeft: '0.5rem',
                      backgroundColor: '#f08080',
                      color: 'black',
                      padding: '1rem 0.5rem'
                    }}
                  >
                    Dislike
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
