import { useState, useRef, useCallback } from 'react';
import { 
  newBag, emptyBoard, spawnPiece, fits, place, clearLines, rotate, ghostY, 
  SCORE_TABLE
} from '../../models/tetris/tetrisModel';

export function useTetris() {
  const stateRef = useRef(null);
  const lastDropRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lbVisible, setLbVisible] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/tetris/session`, {
        method: 'POST',
      });
      const json = await res.json();
      setSessionToken(json.sessionToken || null);
    } catch {
      setSessionToken(null);
    }
  }, []);

  const initState = useCallback(() => {
    const bag = newBag();
    const nextBag = newBag();
    const currentKey = bag.pop();
    setScore(0);
    setLbVisible(false);
    requestSession();
    
    const newState = {
      board: emptyBoard(),
      current: spawnPiece(currentKey),
      bag,
      nextBag,
      next: bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1],
      hold: null,
      holdUsed: false,
      score: 0,
      lines: 0,
      level: 0,
      status: 'playing',
      softDrop: false,
    };
    stateRef.current = newState;
    return newState;
  }, [requestSession]);

  const lockAndNext = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const { board, current } = s;
    const newBoard = place(board, current.shape, current.x, current.y, current.color);
    const { board: clearedBoard, cleared } = clearLines(newBoard);

    let bag = [...s.bag], nextBag = [...s.nextBag];
    bag.length ? bag.pop() : nextBag.pop();
    if (!bag.length) { const nb = newBag(); bag = nb; }
    const afterNext = bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1];

    const newScore = s.score + SCORE_TABLE[cleared] * (s.level + 1);
    const newLines = s.lines + cleared;
    const newLevel = Math.min(10, Math.floor(newLines / 10));
    const newCurrent = spawnPiece(s.next);

    if (!fits(clearedBoard, newCurrent.shape, newCurrent.x, newCurrent.y)) {
      s.board = clearedBoard;
      s.status = 'over';
      setLbVisible(true);
      return;
    }

    s.board = clearedBoard;
    s.current = newCurrent;
    s.bag = bag;
    s.nextBag = nextBag;
    s.next = afterNext;
    s.score = newScore;
    s.lines = newLines;
    s.level = newLevel;
    s.holdUsed = false;
    setScore(newScore);
  }, []);

  const doHold = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.holdUsed || s.status !== 'playing') return;
    const currentKey = s.current.color;
    let newCurrent;
    if (s.hold) {
      newCurrent = spawnPiece(s.hold);
    } else {
      let { bag, nextBag } = s;
      bag = [...bag]; nextBag = [...nextBag];
      const nextKey = bag.length ? bag.pop() : nextBag.pop();
      if (!bag.length) { bag = newBag(); }
      const afterNext = bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1];
      newCurrent = spawnPiece(nextKey);
      s.bag = bag; s.nextBag = nextBag; s.next = afterNext;
    }
    if (!fits(s.board, newCurrent.shape, newCurrent.x, newCurrent.y)) {
      s.status = 'over'; setLbVisible(true); return;
    }
    s.hold = currentKey;
    s.current = newCurrent;
    s.holdUsed = true;
  }, []);

  const handleAction = useCallback((action) => {
    const s = stateRef.current;
    if (!s || s.status !== 'playing') return;

    if (action === 'Left') {
      if (fits(s.board, s.current.shape, s.current.x - 1, s.current.y)) s.current.x--;
    } else if (action === 'Right') {
      if (fits(s.board, s.current.shape, s.current.x + 1, s.current.y)) s.current.x++;
    } else if (action === 'Rotate') {
      const rot = rotate(s.current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (fits(s.board, rot, s.current.x + k, s.current.y)) {
          s.current.shape = rot; s.current.x += k; break;
        }
      }
    } else if (action === 'HardDrop') {
      const gy = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
      s.current.y = gy;
      lockAndNext();
      lastDropRef.current = performance.now();
    } else if (action === 'Hold') {
      doHold();
    }
  }, [lockAndNext, doHold]);

  return {
    stateRef,
    score,
    lbVisible,
    sessionToken,
    setLbVisible,
    initState,
    handleAction,
    lockAndNext,
    doHold,
    lastDropRef,
  };
}
