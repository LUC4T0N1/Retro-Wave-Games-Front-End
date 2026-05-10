import { useState, useRef, useCallback } from 'react';
import { 
  levelConfig, buildMaze, countDots, GHOST_COLORS, EXIT_COL, EXIT_ROW 
} from '../../models/pacman/pacmanModel';

export function usePacman() {
  const stateRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, lives: 3, level: 1, status: 'playing' });
  const [lbVisible, setLbVisible] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const initState = useCallback((level = 1, score = 0, lives = 3) => {
    const cfg  = levelConfig(level);
    const maze = buildMaze();
    return {
      maze,
      totalDots: countDots(maze),
      dotsLeft:  countDots(maze),
      score, lives, level,
      status: 'playing',
      levelCompleteTimer: 0,
      pacman: {
        x: 10, y: 16, prevX: 10, prevY: 16,
        dx: 0, dy: 0, nextDx: 0, nextDy: 0,
        animT: 0, moveAccum: 0,
      },
      ghosts: GHOST_COLORS.map((color, i) => {
        const sx = i === 0 ? EXIT_COL : (9 + (i - 1));
        const sy = i === 0 ? EXIT_ROW : 9;
        return {
          color, x: sx, y: sy, prevX: sx, prevY: sy,
          dx: 0, dy: 0,
          mode: i === 0 ? 'chase' : 'house',
          releaseTimer: cfg.releaseDelays[i],
          frightTimer: 0,
          moveAccum: 0, lastMoveSpeed: cfg.ghostSpeed,
          bounceDir: 1, bounceAccum: 0,
          homeX: sx, homeY: sy,
        };
      }),
      pacSpeed:         cfg.pacSpeed,
      ghostSpeed:       cfg.ghostSpeed,
      frightenDuration: cfg.frightenDuration,
      ghostEatCombo: 0,
      deathAnim: 0,
      deathAnimating: false,
    };
  }, []);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/pacman/session`, {
        method: 'POST',
      });
      const json = await res.json();
      setSessionToken(json.sessionToken || null);
    } catch {
      setSessionToken(null);
    }
  }, []);

  const restart = useCallback(() => {
    stateRef.current = initState(1);
    setUi({ score: 0, lives: 3, level: 1, status: 'playing' });
    setLbVisible(false);
    requestSession();
  }, [initState, requestSession]);

  const changeDirection = useCallback((key) => {
    const s = stateRef.current;
    if (!s || s.status !== 'playing') return;
    const MAP = {
      ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
      w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
    };
    const d = MAP[key];
    if (d) { s.pacman.nextDx = d[0]; s.pacman.nextDy = d[1]; }
  }, []);

  return {
    stateRef,
    ui,
    setUi,
    lbVisible,
    setLbVisible,
    sessionToken,
    restart,
    initState,
    changeDirection,
  };
}
