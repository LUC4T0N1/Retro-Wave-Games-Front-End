import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from '../../ui/Leaderboard'; // Importado
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

const COLS = 10;
const ROWS = 20;
const COLORS = {
  I: '#00e5ff',
  O: '#ffe066',
  T: '#c200ff',
  S: '#00ffcc',
  Z: '#ff2d78',
  J: '#ff6600',
  L: '#0066ff',
};

const PIECES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'I' },
  O: { shape: [[1, 1], [1, 1]], color: 'O' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'T' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'S' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'Z' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'J' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'L' },
};

const PIECE_KEYS = Object.keys(PIECES);
const SCORE_TABLE = [0, 100, 300, 500, 800];
const LEVEL_SPEED = [800, 720, 630, 550, 470, 380, 300, 220, 130, 100, 80];

function rotate(shape) {
  const N = shape.length;
  return shape[0].map((_, c) => shape.map((row, r) => shape[N - 1 - r][c]));
}

function newBag() {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function fits(board, shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = py + r, nc = px + c;
      if (nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (nr >= 0 && board[nr][nc]) return false;
    }
  }
  return true;
}

function place(board, shape, px, py, color) {
  const b = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && py + r >= 0) b[py + r][px + c] = color;
  return b;
}

function clearLines(board) {
  const kept = board.filter(row => row.some(c => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

function ghostY(board, shape, px, py) {
  let gy = py;
  while (fits(board, shape, px, gy + 1)) gy++;
  return gy;
}

function spawnPiece(key) {
  const p = PIECES[key];
  return { shape: p.shape, color: p.color, x: Math.floor((COLS - p.shape[0].length) / 2), y: -1 };
}

export default function TetrisGame() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const lastDropRef = useRef(0);
  const sessionTokenRef = useRef(null);
  const lbVisibleRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lbVisible, setLbVisible] = useState(false);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/tetris/session`, {
        method: 'POST',
      });
      const json = await res.json();
      sessionTokenRef.current = json.sessionToken || null;
    } catch {
      sessionTokenRef.current = null;
    }
  }, []);

  const initState = useCallback(() => {
    const bag = newBag();
    const nextBag = newBag();
    const currentKey = bag.pop();
    setScore(0);
    setLbVisible(false);
    lbVisibleRef.current = false;
    requestSession();
    return {
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
  }, [requestSession]);

  const drawBlock = useCallback((ctx, x, y, color, cs, alpha = 1, ghost = false) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
    } else {
      const grd = ctx.createLinearGradient(x * cs, y * cs, x * cs + cs, y * cs + cs);
      grd.addColorStop(0, color + 'ff');
      grd.addColorStop(1, color + '99');
      ctx.fillStyle = grd;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color + 'cc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * cs + 2, y * cs + 2, cs * 0.45, cs * 0.18);
    }
    ctx.restore();
  }, []);

  const drawMini = useCallback((ctx, shape, color, ox, oy, cs) => {
    const rows = shape.length, cols = shape[0].length;
    const offX = (4 - cols) / 2, offY = (4 - rows) / 2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (shape[r][c]) drawBlock(ctx, ox + c + offX, oy + r + offY, COLORS[color], cs);
  }, [drawBlock]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const cs = Math.floor(H / (ROWS + 2));
    const boardW = cs * COLS;
    const panelW = cs * 5;
    const totalW = boardW + panelW * 2;
    const bx = (W - totalW) / 2 + panelW;
    const by = (H - cs * ROWS) / 2;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.85)';
    ctx.fillRect(bx, by, boardW, cs * ROWS);
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.strokeRect(bx, by, boardW, cs * ROWS);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(bx, by + r * cs); ctx.lineTo(bx + boardW, by + r * cs); ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(bx + c * cs, by); ctx.lineTo(bx + c * cs, by + cs * ROWS); ctx.stroke();
    }
    ctx.restore();

    const s = stateRef.current;
    if (!s) return;

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (s.board[r][c]) drawBlock(ctx, bx / cs + c, by / cs + r, COLORS[s.board[r][c]], cs);

    ctx.save();
    ctx.translate(bx, by);
    ctx.beginPath();
    ctx.rect(0, 0, boardW, cs * ROWS);
    ctx.clip();

    if (s.status === 'playing' && s.current) {
      const gy = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
      if (gy !== s.current.y) {
        for (let r = 0; r < s.current.shape.length; r++)
          for (let c = 0; c < s.current.shape[r].length; c++)
            if (s.current.shape[r][c])
              drawBlock(ctx, s.current.x + c, gy + r, COLORS[s.current.color], cs, 0.35, true);
      }
    }

    if (s.current && s.status !== 'over') {
      for (let r = 0; r < s.current.shape.length; r++)
        for (let c = 0; c < s.current.shape[r].length; c++)
          if (s.current.shape[r][c])
            drawBlock(ctx, s.current.x + c, s.current.y + r, COLORS[s.current.color], cs);
    }
    ctx.restore();

    const lx = (W - totalW) / 2;
    const ly = by;
    const miniCs = cs * 0.8;

    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(180,0,255,0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(lx, ly, panelW - cs * 0.4, cs * 6);
    ctx.strokeRect(lx, ly, panelW - cs * 0.4, cs * 6);
    ctx.restore();

    ctx.save();
    ctx.font = `bold ${cs * 0.42}px Orbitron, sans-serif`;
    ctx.fillStyle = '#c200ff';
    ctx.shadowColor = '#c200ff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', lx + (panelW - cs * 0.4) / 2, ly + cs * 0.85);
    ctx.restore();

    if (s.hold) {
      ctx.save();
      ctx.translate(lx, ly + cs * 1.2);
      drawMini(ctx, PIECES[s.hold].shape, PIECES[s.hold].color, 0.3, 0.3, miniCs);
      ctx.restore();
    }

    const rx = bx + boardW + cs * 0.4;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(rx, ly, panelW - cs * 0.4, cs * 6);
    ctx.strokeRect(rx, ly, panelW - cs * 0.4, cs * 6);
    ctx.restore();

    ctx.save();
    ctx.font = `bold ${cs * 0.42}px Orbitron, sans-serif`;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', rx + (panelW - cs * 0.4) / 2, ly + cs * 0.85);
    ctx.restore();

    if (s.next) {
      ctx.save();
      ctx.translate(rx, ly + cs * 1.2);
      drawMini(ctx, PIECES[s.next].shape, PIECES[s.next].color, 0.3, 0.3, miniCs);
      ctx.restore();
    }

    const scoreY = ly + cs * 7;
    const scoreH = cs * 9;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(rx, scoreY, panelW - cs * 0.4, scoreH);
    ctx.strokeRect(rx, scoreY, panelW - cs * 0.4, scoreH);
    ctx.restore();

    const labels = [
      { label: 'SCORE', value: s.score, color: '#ffe066' },
      { label: 'LINES', value: s.lines, color: '#00ffcc' },
      { label: 'LEVEL', value: s.level, color: '#ff2d78' },
    ];
    labels.forEach(({ label, value, color }, i) => {
      const ty = scoreY + cs * 1.4 + i * cs * 2.6;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${cs * 0.38}px Orbitron, sans-serif`;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillText(label, rx + (panelW - cs * 0.4) / 2, ty);
      ctx.font = `bold ${cs * 0.62}px Orbitron, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillText(String(value), rx + (panelW - cs * 0.4) / 2, ty + cs * 0.9);
      ctx.restore();
    });

    if (s.status === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(4,0,18,0.75)';
      ctx.fillRect(bx - 2, by, boardW + 4, cs * ROWS);
      ctx.textAlign = 'center';
      ctx.font = `bold ${cs * 0.72}px Orbitron, sans-serif`;
      ctx.fillStyle = '#c200ff';
      ctx.shadowColor = '#c200ff';
      ctx.shadowBlur = 24;
      ctx.fillText('PAUSED', bx + boardW / 2, by + cs * ROWS / 2);
      ctx.restore();
    }
  }, [drawBlock, drawMini]);

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
      s.status = 'over'; setLbVisible(true); lbVisibleRef.current = true; return;
    }
    s.hold = currentKey;
    s.current = newCurrent;
    s.holdUsed = true;
  }, []);

  const lockAndNext = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const { board, current } = s;
    const newBoard = place(board, current.shape, current.x, current.y, current.color);
    const { board: clearedBoard, cleared } = clearLines(newBoard);

    let bag = [...s.bag], nextBag = [...s.nextBag];
    const nextKey = bag.length ? bag.pop() : nextBag.pop();
    if (!bag.length) { const nb = newBag(); bag = nb; }
    const afterNext = bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1];

    const newScore = s.score + SCORE_TABLE[cleared] * (s.level + 1);
    const newLines = s.lines + cleared;
    const newLevel = Math.min(10, Math.floor(newLines / 10));
    const newCurrent = spawnPiece(s.next);

    setScore(newScore);

    if (!fits(clearedBoard, newCurrent.shape, newCurrent.x, newCurrent.y)) {
      s.board = clearedBoard;
      s.status = 'over';
      setLbVisible(true);
      lbVisibleRef.current = true;
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
  }, []);

  const dropInterval = useCallback(() => {
    const s = stateRef.current;
    if (!s) return 800;
    const base = LEVEL_SPEED[s.level] ?? 80;
    return s.softDrop ? Math.max(50, base / 8) : base;
  }, []);

  useEffect(() => {
    stateRef.current = initState();
    lastDropRef.current = performance.now();

    const cv = canvasRef.current;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;

    const onResize = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const onKey = (e) => {
      if (lbVisibleRef.current) return;
      const s = stateRef.current;
      if (!s) return;

      if (e.code === 'KeyR') { stateRef.current = initState(); lastDropRef.current = performance.now(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (s.status === 'playing') s.status = 'paused';
        else if (s.status === 'paused') s.status = 'playing';
        return;
      }
      if (s.status !== 'playing') return;

      if (e.code === 'ArrowLeft') {
        if (fits(s.board, s.current.shape, s.current.x - 1, s.current.y)) s.current.x--;
      } else if (e.code === 'ArrowRight') {
        if (fits(s.board, s.current.shape, s.current.x + 1, s.current.y)) s.current.x++;
      } else if (e.code === 'ArrowDown') {
        s.softDrop = true;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyX') {
        const rot = rotate(s.current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const k of kicks) {
          if (fits(s.board, rot, s.current.x + k, s.current.y)) {
            s.current.shape = rot; s.current.x += k; break;
          }
        }
      } else if (e.code === 'KeyZ') {
        const rotL = rotate(rotate(rotate(s.current.shape)));
        const kicks = [0, 1, -1, 2, -2];
        for (const k of kicks) {
          if (fits(s.board, rotL, s.current.x + k, s.current.y)) {
            s.current.shape = rotL; s.current.x += k; break;
          }
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        const gy = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
        s.current.y = gy;
        lockAndNext();
        lastDropRef.current = performance.now();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') {
        doHold();
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown') {
        const s = stateRef.current;
        if (s) s.softDrop = false;
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    let lastRaf = 0;
    const loop = (ts) => {
      animRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;
      if (s && s.status === 'playing') {
        const elapsed = ts - lastDropRef.current;
        if (elapsed >= dropInterval()) {
          const moved = fits(s.board, s.current.shape, s.current.x, s.current.y + 1);
          if (moved) s.current.y++;
          else lockAndNext();
          lastDropRef.current = ts;
        }
      }
      if (ts - lastRaf > 16) { render(); lastRaf = ts; }
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    };
  }, [initState, lockAndNext, doHold, dropInterval, render]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 10, display: 'block', width: '100%', height: '100%' }} />
      <HomeButton />

      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/tetris`}
        score={score}
        sessionToken={sessionTokenRef.current}
        onPlayAgain={() => {
          stateRef.current = initState();
          lastDropRef.current = performance.now();
        }}
        visible={lbVisible}
      />
    </div>
  );
}