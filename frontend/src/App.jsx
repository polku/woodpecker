import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

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
  };

  const fetchNextPuzzle = async () => {
    const res = await axios.get(`/api/sessions/${session}/puzzle`);
    if (res.data) {
      setPuzzle(res.data);
      setChess(new Chess(res.data.fen));
    } else {
      const summaryRes = await axios.get(`/api/sessions/${session}/summary`);
      setSummary(summaryRes.data);
      clearInterval(timerId);
    }
  };

  const onDrop = async (sourceSquare, targetSquare) => {
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false;
    setChess(new Chess(chess.fen()));

    const res = await axios.post(`/api/sessions/${session}/move`, { move: `${sourceSquare}${targetSquare}` });
    setScore(res.data.score);

    if (!res.data.correct) {
      alert('Incorrect!');
      if (res.data.solution) {
        alert('Solution: ' + res.data.solution.join(', '));
      }
      await fetchNextPuzzle();
      return true;
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
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <span>Score: {score}</span> | <span>Time: {elapsed}s</span> |
        <span>{chess.turn() === 'w' ? 'White' : 'Black'} to move</span>
      </div>
      <Chessboard boardWidth={boardWidth} position={chess.fen()} onPieceDrop={onDrop} />
    </div>
  );
}

export default App;
