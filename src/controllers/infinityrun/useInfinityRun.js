import { useState, useRef, useCallback } from 'react';
import { makeState, INIT_SPEED } from '../../models/infinityrun/infinityRunModel';

export function useInfinityRun() {
  const stateRef = useRef(null);
  const inputRef = useRef({ jumpQ: 0, duckHeld: false });
  const [ui, setUi] = useState({ score: 0, speed: INIT_SPEED, status: 'playing' });
  const [lbVisible, setLbVisible] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/infinity-run/session`, {
        method: 'POST',
      });
      const json = await res.json();
      setSessionToken(json.sessionToken || null);
    } catch {
      setSessionToken(null);
    }
  }, []);

  const restart = useCallback(() => {
    stateRef.current = makeState();
    setLbVisible(false);
    setUi({ score: 0, speed: INIT_SPEED, status: 'playing' });
    requestSession();
  }, [requestSession]);

  return {
    stateRef,
    inputRef,
    ui,
    setUi,
    lbVisible,
    setLbVisible,
    sessionToken,
    restart,
  };
}
