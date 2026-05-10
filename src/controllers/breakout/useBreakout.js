import { useState, useRef, useCallback, useEffect } from 'react';
import { buildState, LIVES_START } from '../../models/breakout/breakoutModel';

export function useBreakout() {
  const stateRef = useRef(buildState());
  const keysRef = useRef({});
  const [ui, setUi] = useState({ status: 'idle', score: 0, level: 1, lives: LIVES_START, best: 0 });
  const [lbVisible, setLbVisible] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const getBest = () => parseInt(localStorage.getItem('breakoutBest') || '0');
  
  const syncUi = useCallback(() => {
    const s = stateRef.current;
    setUi({ status: s.status, score: s.score, level: s.level, lives: s.lives, best: getBest() });
  }, []);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/breakout/session`, {
        method: 'POST',
      });
      const json = await res.json();
      const token = json.sessionToken || null;
      setSessionToken(token);
      return token;
    } catch {
      setSessionToken(null);
      return null;
    }
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = buildState(1, 0, LIVES_START);
    setLbVisible(false);
    setSessionToken(null);
    syncUi();
    requestSession();
  }, [requestSession, syncUi]);

  useEffect(() => {
    setUi(u => ({ ...u, best: getBest() }));
  }, []);

  return {
    stateRef,
    keysRef,
    ui,
    setUi,
    lbVisible,
    setLbVisible,
    sessionToken,
    syncUi,
    startGame,
    requestSession,
  };
}
