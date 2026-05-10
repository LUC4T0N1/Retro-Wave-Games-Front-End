import { useState, useRef, useCallback } from 'react';
import { buildState, getBest } from '../../models/snake/snakeModel';

export function useSnake() {
  const stateRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, level: 1, best: getBest(), status: 'playing' });
  const [lbVisible, setLbVisible] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/snake/session`, {
        method: 'POST',
      });
      const json = await res.json();
      setSessionToken(json.sessionToken || null);
    } catch {
      setSessionToken(null);
    }
  }, []);

  const restart = useCallback(() => {
    const s = buildState(1, 0);
    stateRef.current = s;
    setUi({ score: 0, level: 1, best: s.best, status: 'playing' });
    setLbVisible(false);
    requestSession();
  }, [requestSession]);

  const changeDirection = useCallback((key) => {
    const DIR = {
      ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
      w: { dx: 0, dy: -1 }, s: { dx: 0, dy: 1 }, a: { dx: -1, dy: 0 }, d: { dx: 1, dy: 0 },
    };
    const st = stateRef.current;
    if (!st || st.status === 'dead') return;
    const nd = DIR[key];
    if (!nd) return;
    const lastDir = (st.dirQueue && st.dirQueue.length > 0) ? st.dirQueue[st.dirQueue.length - 1] : st.dir;
    if (!(nd.dx === -lastDir.dx && nd.dy === -lastDir.dy) && !(nd.dx === lastDir.dx && nd.dy === lastDir.dy)) {
      if (!st.dirQueue) st.dirQueue = [];
      if (st.dirQueue.length < 3) st.dirQueue.push(nd);
    }
  }, []);

  return {
    stateRef,
    ui,
    setUi,
    lbVisible,
    setLbVisible,
    sessionToken,
    restart,
    changeDirection,
  };
}
