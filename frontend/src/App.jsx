import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

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
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="red" />
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
  const [boardWidth, setBoardWidth] = useState(Math.min(480, window.innerWidth - 20));
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [showSolution, setShowSolution] = useState(false);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [solutionIndex, setSolutionIndex] = useState(0);

  const orientationFromFen = fen =>
    fen.split(' ')[1] === 'w' ? 'white' : 'black';

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

  const startSession = async () => {
    const res = await axios.post('/api/sessions', { puzzle_set_id: parseInt(selectedSet) });
    setSession(res.data.id);
    setPuzzle(res.data.puzzle);
    setScore(res.data.score);
    setElapsed(res.data.elapsed_seconds);
    setChess(new Chess(res.data.puzzle.fen));
    setBoardOrientation(orientationFromFen(res.data.puzzle.fen));
  };

  const fetchNextPuzzle = async () => {
    const res = await axios.get(`/api/sessions/${session}/puzzle`);
    if (res.data) {
      setPuzzle(res.data);
      setChess(new Chess(res.data.fen));
      setBoardOrientation(orientationFromFen(res.data.fen));
      setShowSolution(false);
      setSolutionMoves([]);
      setSolutionIndex(0);
    } else {
      const summaryRes = await axios.get(`/api/sessions/${session}/summary`);
      setSummary(summaryRes.data);
      clearInterval(timerId);
    }
  };

  const stepForward = () => {
    if (solutionIndex >= solutionMoves.length) return;
    const c = new Chess(chess.fen());
    c.move(solutionMoves[solutionIndex]);
    setChess(c);
    setSolutionIndex(solutionIndex + 1);
  };

  const stepBackward = () => {
    if (solutionIndex === 0) return;
    const c = new Chess(puzzle.fen);
    for (let i = 0; i < solutionIndex - 1; i++) {
      c.move(solutionMoves[i]);
    }
    setChess(c);
    setSolutionIndex(solutionIndex - 1);
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

  const onDrop = async (sourceSquare, targetSquare) => {
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false;
    setChess(new Chess(chess.fen()));

    const res = await axios.post(`/api/sessions/${session}/move`, { move: `${sourceSquare}${targetSquare}` });
    setScore(res.data.score);

    if (!res.data.correct) {
      alert('Incorrect!');
      if (res.data.solution) {
        setShowSolution(true);
        setSolutionMoves(res.data.solution);
        setSolutionIndex(0);
        setChess(new Chess(puzzle.fen));
      } else {
        await fetchNextPuzzle();
      }
      return true;
    }

    if (res.data.next_move) {
      const c = new Chess(chess.fen());
      c.move(res.data.next_move);
      setChess(c);
    }

    if (res.data.puzzle_solved) {
      await fetchNextPuzzle();
    }

    return true;
  };

  if (summary) {
    return (
      <div style={{ padding: '1rem' }}>
        <h2>Session Summary</h2>
        <p>Score: {summary.score}</p>
        <p>Time: {summary.elapsed_seconds}s</p>
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
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex' }}>
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <span>Score: {score}</span> | <span>Time: {elapsed}s</span> |
          <span>{chess.turn() === 'w' ? 'White' : 'Black'} to move</span>
        </div>
        <div style={{ position: 'relative', width: boardWidth }}>
          <Chessboard
            boardWidth={boardWidth}
            position={chess.fen()}
            boardOrientation={boardOrientation}
            onPieceDrop={showSolution ? undefined : onDrop}
            arePiecesDraggable={!showSolution}
          />
          {showSolution && (
            <ArrowOverlay
              move={solutionIndex < solutionMoves.length ? solutionMoves[solutionIndex] : null}
              boardWidth={boardWidth}
              orientation={boardOrientation}
            />
          )}
        </div>
      </div>
      {showSolution && (
        <div style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button onClick={stepBackward} disabled={solutionIndex === 0}>{'<'}</button>
          <div style={{ margin: '0.5rem 0' }}>{solutionIndex}/{solutionMoves.length}</div>
          <button onClick={stepForward} disabled={solutionIndex === solutionMoves.length}>{'>'}</button>
          <button onClick={fetchNextPuzzle} style={{ marginTop: '1rem' }}>Next Puzzle</button>
        </div>
      )}
    </div>
  );
}

export default App;
