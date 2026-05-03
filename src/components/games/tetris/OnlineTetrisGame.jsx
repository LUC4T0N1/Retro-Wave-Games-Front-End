import { useEffect, useRef, useCallback, useState } from 'react';


import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

const COLS = 10;
const ROWS = 20;
const COLORS = {
  I: '#00e5ff', O: '#ffe066', T: '#c200ff',
  S: '#00ffcc', Z: '#ff2d78', J: '#ff6600', L: '#0066ff',
};
const PIECES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'I' },
  O: { shape: [[1,1],[1,1]], color: 'O' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'T' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'S' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'Z' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'J' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'L' },
};
const PIECE_KEYS = Object.keys(PIECES);
const SCORE_TABLE = [0, 100, 300, 500, 800];
const LEVEL_SPEED = [800, 720, 630, 550, 470, 380, 300, 220, 130, 100, 80];

function rotate(shape) {
  const N = shape.length;
  return shape[0].map((_, c) => shape.map((_, r) => shape[N - 1 - r][c]));
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

function makeMyState() {
  const bag = newBag();
  const nextBag = newBag();
  const currentKey = bag.pop();
  return {
    board: emptyBoard(),
    current: spawnPiece(currentKey),
    bag, nextBag,
    next: bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1],
    hold: null, holdUsed: false,
    score: 0, lines: 0, level: 0,
    status: 'playing', softDrop: false,
  };
}

function makeOppState() {
  return { board: emptyBoard(), falling: null, score: 0, lines: 0, level: 0 };
}

export default function OnlineTetrisGame({ socket, room, opponentName }) {
  const canvasRef     = useRef(null);
  const myStateRef    = useRef(null);
  const oppStateRef   = useRef(null);
  const animRef       = useRef(null);
  const lastDropRef   = useRef(0);
  const pieceBcastRef = useRef(0);
  const resultRef     = useRef(null);
  const myReadyRef    = useRef(false);
  const oppReadyRef   = useRef(false);

  const [result, setResult]               = useState(null);
  const [waitingRestart, setWaitingRestart] = useState(false);

  // ── Drawing ──────────────────────────────────────────────────────────────

  const drawBlock = useCallback((ctx, px, py, color, cs, alpha = 1, ghost = false) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
    } else {
      const grd = ctx.createLinearGradient(px, py, px + cs, py + cs);
      grd.addColorStop(0, color + 'ff');
      grd.addColorStop(1, color + '99');
      ctx.fillStyle = grd;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color + 'cc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px + 2, py + 2, cs * 0.45, cs * 0.18);
    }
    ctx.restore();
  }, []);

  const drawMini = useCallback((ctx, shape, colorKey, areaX, areaY, areaW, areaH, miniCs) => {
    const rows = shape.length, cols = shape[0].length;
    const pieceW = cols * miniCs, pieceH = rows * miniCs;
    const ox = areaX + (areaW - pieceW) / 2;
    const oy = areaY + (areaH - pieceH) / 2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (shape[r][c])
          drawBlock(ctx, ox + c * miniCs, oy + r * miniCs, COLORS[colorKey], miniCs);
  }, [drawBlock]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;

    const cs = Math.max(14, Math.min(26, Math.floor(Math.min((W - 80) / 36, (H - 60) / 22))));
    const boardH = cs * ROWS;
    const boardW = cs * COLS;
    const holdW  = cs * 5;
    const statsW = cs * 5;
    const oppStW = cs * 4;

    const leftW  = holdW + boardW + statsW;
    const gap    = Math.max(20, cs * 2);
    const rightW = boardW + oppStW;
    const totalW = leftW + gap + rightW;

    const sx = Math.floor((W - totalW) / 2);
    const sy = Math.floor((H - boardH) / 2);

    const myHoldX  = sx;
    const myBoardX = sx + holdW;
    const myStX    = myBoardX + boardW;
    const oppBoardX = sx + leftW + gap;
    const oppStX    = oppBoardX + boardW;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const s   = myStateRef.current;
    const opp = oppStateRef.current;
    if (!s) return;

    // ── My board ────────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.85)';
    ctx.fillRect(myBoardX, sy, boardW, boardH);
    ctx.strokeStyle = 'rgba(0,229,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.strokeRect(myBoardX, sy, boardW, boardH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(myBoardX, sy + r * cs); ctx.lineTo(myBoardX + boardW, sy + r * cs); ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(myBoardX + c * cs, sy); ctx.lineTo(myBoardX + c * cs, sy + boardH); ctx.stroke();
    }
    ctx.restore();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (s.board[r][c])
          drawBlock(ctx, myBoardX + c * cs, sy + r * cs, COLORS[s.board[r][c]], cs);

    ctx.save();
    ctx.beginPath();
    ctx.rect(myBoardX, sy, boardW, boardH);
    ctx.clip();
    if (s.status === 'playing' && s.current) {
      const gy = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
      if (gy !== s.current.y) {
        for (let r = 0; r < s.current.shape.length; r++)
          for (let c = 0; c < s.current.shape[r].length; c++)
            if (s.current.shape[r][c])
              drawBlock(ctx, myBoardX + (s.current.x + c) * cs, sy + (gy + r) * cs, COLORS[s.current.color], cs, 0.32, true);
      }
    }
    if (s.current && s.status !== 'over') {
      for (let r = 0; r < s.current.shape.length; r++)
        for (let c = 0; c < s.current.shape[r].length; c++)
          if (s.current.shape[r][c])
            drawBlock(ctx, myBoardX + (s.current.x + c) * cs, sy + (s.current.y + r) * cs, COLORS[s.current.color], cs);
    }
    ctx.restore();

    // "YOU" label
    ctx.save();
    ctx.font = `bold ${cs * 0.45}px Orbitron, sans-serif`;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText('YOU', myBoardX + boardW / 2, sy - cs * 0.4);
    ctx.restore();

    if (s.status === 'dead' && !resultRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(myBoardX, sy, boardW, boardH);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(16, cs * 1.2)}px Orbitron, sans-serif`;
      ctx.fillText('DIED', myBoardX + boardW / 2, sy + boardH / 2 - 10);
      ctx.fillText('SPECTATING', myBoardX + boardW / 2, sy + boardH / 2 + 20);
      ctx.restore();
    }

    // ── Hold panel ───────────────────────────────────────────────────────────
    const holdPW = holdW - cs * 0.3;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(194,0,255,0.30)';
    ctx.lineWidth = 1;
    ctx.fillRect(myHoldX, sy, holdPW, cs * 6);
    ctx.strokeRect(myHoldX, sy, holdPW, cs * 6);
    ctx.restore();

    ctx.save();
    ctx.font = `bold ${cs * 0.38}px Orbitron, sans-serif`;
    ctx.fillStyle = '#c200ff';
    ctx.shadowColor = '#c200ff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', myHoldX + holdPW / 2, sy + cs * 0.85);
    ctx.restore();

    if (s.hold)
      drawMini(ctx, PIECES[s.hold].shape, s.hold, myHoldX, sy + cs, holdPW, cs * 4.5, cs * 0.78);

    // ── My stats: NEXT + score/lines/level ─────────────────────────────────
    const stPW = statsW - cs * 0.3;
    const stPX = myStX + cs * 0.3;

    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(stPX, sy, stPW, cs * 6);
    ctx.strokeRect(stPX, sy, stPW, cs * 6);
    ctx.restore();

    ctx.save();
    ctx.font = `bold ${cs * 0.38}px Orbitron, sans-serif`;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', stPX + stPW / 2, sy + cs * 0.85);
    ctx.restore();

    if (s.next)
      drawMini(ctx, PIECES[s.next].shape, s.next, stPX, sy + cs, stPW, cs * 4.5, cs * 0.78);

    const scoreBoxY = sy + cs * 7;
    const scoreBoxH = cs * 9;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(stPX, scoreBoxY, stPW, scoreBoxH);
    ctx.strokeRect(stPX, scoreBoxY, stPW, scoreBoxH);
    ctx.restore();

    [
      { label: 'SCORE', value: s.score, color: '#ffe066' },
      { label: 'LINES', value: s.lines, color: '#00ffcc' },
      { label: 'LEVEL', value: s.level, color: '#ff2d78' },
    ].forEach(({ label, value, color }, i) => {
      const ty = scoreBoxY + cs * 1.4 + i * cs * 2.6;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${cs * 0.38}px Orbitron, sans-serif`;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
      ctx.fillText(label, stPX + stPW / 2, ty);
      ctx.font = `bold ${cs * 0.62}px Orbitron, sans-serif`;
      ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 14;
      ctx.fillText(String(value), stPX + stPW / 2, ty + cs * 0.9);
      ctx.restore();
    });

    // ── VS label ─────────────────────────────────────────────────────────────
    const vsX = sx + leftW + gap / 2;
    ctx.save();
    ctx.font = `bold ${cs * 0.65}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ff2d78';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 16;
    ctx.textAlign = 'center';
    ctx.fillText('VS', vsX, sy + boardH / 2);
    ctx.restore();

    // ── Opponent board ────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.85)';
    ctx.fillRect(oppBoardX, sy, boardW, boardH);
    ctx.strokeStyle = 'rgba(255,45,120,0.30)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 8;
    ctx.strokeRect(oppBoardX, sy, boardW, boardH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ff2d78';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(oppBoardX, sy + r * cs); ctx.lineTo(oppBoardX + boardW, sy + r * cs); ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(oppBoardX + c * cs, sy); ctx.lineTo(oppBoardX + c * cs, sy + boardH); ctx.stroke();
    }
    ctx.restore();

    if (opp) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (opp.board[r][c])
            drawBlock(ctx, oppBoardX + c * cs, sy + r * cs, COLORS[opp.board[r][c]], cs);

      if (opp.falling) {
        const { x, y, shape, color } = opp.falling;
        ctx.save();
        ctx.beginPath();
        ctx.rect(oppBoardX, sy, boardW, boardH);
        ctx.clip();
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            if (shape[r][c])
              drawBlock(ctx, oppBoardX + (x + c) * cs, sy + (y + r) * cs, COLORS[color], cs, 0.8);
        ctx.restore();
      }

      // Opp stats panel
      const oppPW = oppStW - cs * 0.3;
      const oppPX = oppStX + cs * 0.3;
      ctx.save();
      ctx.fillStyle = 'rgba(4,0,18,0.72)';
      ctx.strokeStyle = 'rgba(255,45,120,0.20)';
      ctx.lineWidth = 1;
      ctx.fillRect(oppPX, sy, oppPW, boardH);
      ctx.strokeRect(oppPX, sy, oppPW, boardH);
      ctx.restore();

      const sectionH = boardH / 3;
      [
        { label: 'SCORE', value: opp.score, color: '#ffe066' },
        { label: 'LINES', value: opp.lines, color: '#00ffcc' },
        { label: 'LEVEL', value: opp.level, color: '#ff2d78' },
      ].forEach(({ label, value, color }, i) => {
        const sectionY = sy + i * sectionH;
        const ty = sectionY + sectionH * 0.38;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `bold ${cs * 0.32}px Orbitron, sans-serif`;
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 5;
        ctx.fillText(label, oppPX + oppPW / 2, ty);
        ctx.font = `bold ${cs * 0.52}px Orbitron, sans-serif`;
        ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.fillText(String(value), oppPX + oppPW / 2, ty + cs * 0.68);
        ctx.restore();
      });
    }

    if (opp && opp.status === 'dead' && !resultRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(oppBoardX, sy, boardW, boardH);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(16, cs * 1.2)}px Orbitron, sans-serif`;
      ctx.fillText('OPPONENT', oppBoardX + boardW / 2, sy + boardH / 2 - 10);
      ctx.fillText('DIED', oppBoardX + boardW / 2, sy + boardH / 2 + 20);
      ctx.restore();
    }

    // Opp name label
    ctx.save();
    ctx.font = `bold ${cs * 0.42}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ff2d78';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(opponentName.substring(0, 10).toUpperCase(), oppBoardX + boardW / 2, sy - cs * 0.4);
    ctx.restore();
  }, [drawBlock, drawMini, opponentName]);

  // ── Game logic ────────────────────────────────────────────────────────────
  const checkGameOver = useCallback(() => {
    const s = myStateRef.current;
    const opp = oppStateRef.current;
    if (s && opp && s.status === 'dead' && opp.status === 'dead') {
      if (resultRef.current) return;
      if (s.score > opp.score) {
        resultRef.current = 'win';
        setResult('win');
      } else if (s.score < opp.score) {
        resultRef.current = 'lose';
        setResult('lose');
      } else {
        resultRef.current = 'tie';
        setResult('tie');
      }
    }
  }, []);

  const lockAndNext = useCallback(() => {
    const s = myStateRef.current;
    if (!s) return;
    const newBoard = place(s.board, s.current.shape, s.current.x, s.current.y, s.current.color);
    const { board: clearedBoard, cleared } = clearLines(newBoard);

    let bag = [...s.bag], nextBag = [...s.nextBag];
    if (bag.length) bag.pop(); else nextBag.pop();
    if (!bag.length) bag = newBag();
    const afterNext = bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1];

    const newScore = s.score + SCORE_TABLE[cleared] * (s.level + 1);
    const newLines = s.lines + cleared;
    const newLevel = Math.min(10, Math.floor(newLines / 10));
    const newCurrent = spawnPiece(s.next);

    socket.emit('tetris-board', { room, board: clearedBoard, score: newScore, lines: newLines, level: newLevel });

    if (!fits(clearedBoard, newCurrent.shape, newCurrent.x, newCurrent.y)) {
      s.board = clearedBoard;
      s.score = newScore; s.lines = newLines; s.level = newLevel;
      s.status = 'dead';
      socket.emit('tetris-died', { room, score: s.score });
      checkGameOver();
      return;
    }

    s.board = clearedBoard;
    s.current = newCurrent;
    s.bag = bag; s.nextBag = nextBag; s.next = afterNext;
    s.score = newScore; s.lines = newLines; s.level = newLevel;
    s.holdUsed = false;

    // Broadcast new piece immediately
    socket.emit('tetris-piece', { room, x: newCurrent.x, y: newCurrent.y, shape: newCurrent.shape, color: newCurrent.color });
  }, [socket, room, checkGameOver]);

  const doHold = useCallback(() => {
    const s = myStateRef.current;
    if (!s || s.holdUsed || s.status !== 'playing') return;
    const currentKey = s.current.color;
    let newCurrent;
    if (s.hold) {
      newCurrent = spawnPiece(s.hold);
    } else {
      let { bag, nextBag } = s;
      bag = [...bag]; nextBag = [...nextBag];
      if (bag.length) bag.pop(); else nextBag.pop();
      if (!bag.length) bag = newBag();
      const afterNext = bag.length ? bag[bag.length - 1] : nextBag[nextBag.length - 1];
      newCurrent = spawnPiece(s.next);
      s.bag = bag; s.nextBag = nextBag; s.next = afterNext;
    }
    if (!fits(s.board, newCurrent.shape, newCurrent.x, newCurrent.y)) {
      s.status = 'dead';
      socket.emit('tetris-died', { room, score: s.score });
      checkGameOver();
      return;
    }
    s.hold = currentKey;
    s.current = newCurrent;
    s.holdUsed = true;
  }, [socket, room, checkGameOver]);

  const doRestart = useCallback(() => {
    myStateRef.current  = makeMyState();
    oppStateRef.current = makeOppState();
    lastDropRef.current = performance.now();
    myReadyRef.current  = false;
    oppReadyRef.current = false;
    resultRef.current   = null;
    setResult(null);
    setWaitingRestart(false);
  }, []);

  const handlePlayAgain = useCallback(() => {
    myReadyRef.current = true;
    socket.emit('tetris-restart-ready', { room });
    if (oppReadyRef.current) {
      doRestart();
    } else {
      setWaitingRestart(true);
    }
  }, [socket, room, doRestart]);

  // ── Effect: mount / unmount ────────────────────────────────────────────────
  useEffect(() => {
    myStateRef.current  = makeMyState();
    oppStateRef.current = makeOppState();
    lastDropRef.current = performance.now();
    resultRef.current   = null;

    const cv = canvasRef.current;
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    // Socket handlers
    const onBoard = ({ board, score, lines, level }) => {
      const o = oppStateRef.current;
      if (o) { o.board = board; o.score = score; o.lines = lines; o.level = level; }
    };
    const onPiece = ({ x, y, shape, color }) => {
      const o = oppStateRef.current;
      if (o) o.falling = { x, y, shape, color };
    };
    const onOppDied = ({ score }) => {
      const opp = oppStateRef.current;
      if (opp) {
        opp.status = 'dead';
        if (score !== undefined) opp.score = score;
      }
      checkGameOver();
    };
    const onOppLeft = () => {
      if (resultRef.current) return;
      if (oppStateRef.current?.status === 'dead') return;
      resultRef.current = 'opp-left';
      setResult('opp-left');
    };
    const onRestartReady = () => {
      oppReadyRef.current = true;
      if (myReadyRef.current) doRestart();
    };

    socket.on('tetris-board',        onBoard);
    socket.on('tetris-piece',        onPiece);
    socket.on('tetris-opp-died',     onOppDied);
    socket.on('tetris-opp-left',     onOppLeft);
    socket.on('tetris-restart-ready', onRestartReady);

    // Key handlers
    const onKey = (e) => {
      if (resultRef.current) return;
      const s = myStateRef.current;
      if (!s || s.status !== 'playing') return;

      if (e.code === 'ArrowLeft') {
        if (fits(s.board, s.current.shape, s.current.x - 1, s.current.y)) s.current.x--;
      } else if (e.code === 'ArrowRight') {
        if (fits(s.board, s.current.shape, s.current.x + 1, s.current.y)) s.current.x++;
      } else if (e.code === 'ArrowDown') {
        s.softDrop = true;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyX') {
        const rot = rotate(s.current.shape);
        for (const k of [0, -1, 1, -2, 2]) {
          if (fits(s.board, rot, s.current.x + k, s.current.y)) {
            s.current.shape = rot; s.current.x += k; break;
          }
        }
      } else if (e.code === 'KeyZ') {
        const rotL = rotate(rotate(rotate(s.current.shape)));
        for (const k of [0, 1, -1, 2, -2]) {
          if (fits(s.board, rotL, s.current.x + k, s.current.y)) {
            s.current.shape = rotL; s.current.x += k; break;
          }
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        s.current.y = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
        lockAndNext();
        lastDropRef.current = performance.now();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') {
        doHold();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown') {
        const s = myStateRef.current;
        if (s) s.softDrop = false;
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    // Game loop
    const loop = (ts) => {
      animRef.current = requestAnimationFrame(loop);
      const s = myStateRef.current;
      if (s && s.status === 'playing' && !resultRef.current) {
        const elapsed = ts - lastDropRef.current;
        const speed   = LEVEL_SPEED[s.level] ?? 80;
        const interval = s.softDrop ? Math.max(50, speed / 8) : speed;
        if (elapsed >= interval) {
          if (fits(s.board, s.current.shape, s.current.x, s.current.y + 1)) {
            s.current.y++;
          } else {
            lockAndNext();
          }
          lastDropRef.current = ts;
        }
        if (ts - pieceBcastRef.current > 150) {
          socket.emit('tetris-piece', { room, x: s.current.x, y: s.current.y, shape: s.current.shape, color: s.current.color });
          pieceBcastRef.current = ts;
        }
      }
      render();
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      socket.off('tetris-board',         onBoard);
      socket.off('tetris-piece',         onPiece);
      socket.off('tetris-opp-died',      onOppDied);
      socket.off('tetris-opp-left',      onOppLeft);
      socket.off('tetris-restart-ready', onRestartReady);
      socket.emit('tetris-leave', { room });
    };
  }, [socket, room, lockAndNext, doHold, doRestart, render]);

  const resultColor = result === 'win' ? '#00e5ff' : result === 'tie' ? '#ffe066' : result === 'opp-left' ? '#ffe066' : '#ff2d78';
  const resultText  = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'YOU LOSE' : result === 'tie' ? 'TIE!' : 'OPPONENT LEFT';

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 10, display: 'block', width: '100%', height: '100%' }} />
      <HomeButton />

      {result && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2,0,16,0.93)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 72,
            color: resultColor, letterSpacing: '0.1em',
            textShadow: `0 0 30px ${resultColor}, 0 0 60px ${resultColor}55`,
          }}>{resultText}</div>

          {result !== 'opp-left' && (
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
              {[
                { label: 'YOU', score: myStateRef.current?.score ?? 0, color: '#00e5ff' },
                { label: opponentName.substring(0, 10).toUpperCase(), score: oppStateRef.current?.score ?? 0, color: '#ff2d78' },
              ].map(({ label, score, color }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color, letterSpacing: '0.2em', fontWeight: 700 }}>{label}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 28, color: '#fff', fontWeight: 900 }}>{score}</div>
                </div>
              ))}
            </div>
          )}

          {result !== 'opp-left' && (
            waitingRestart ? (
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em' }}>
                WAITING FOR {opponentName.toUpperCase()}…
              </div>
            ) : (
              <button
                onClick={handlePlayAgain}
                style={{
                  background: 'rgba(4,0,18,0.65)', border: `2px solid ${resultColor}`,
                  color: resultColor, fontFamily: "'Orbitron', sans-serif",
                  fontSize: 14, fontWeight: 700, letterSpacing: '0.15em',
                  padding: '14px 36px', cursor: 'pointer', borderRadius: 3,
                  textTransform: 'uppercase', boxShadow: `0 0 16px ${resultColor}44`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${resultColor}22`; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = resultColor; }}
              >
                PLAY AGAIN
              </button>
            )
          )}

          <div style={{ marginTop: 20 }}>
            <HomeButton />
          </div>
        </div>
      )}
    </div>
  );
}
