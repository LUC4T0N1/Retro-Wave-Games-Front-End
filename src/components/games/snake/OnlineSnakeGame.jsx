import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';
import isMobile from '../../../utils/isMobile';
import SnakeMobileControls from './SnakeMobileControls';

const COLS = 21;
const ROWS = 21;
const FOODS_PER_LEVEL = 5;

function randomFood(snake) {
  const occ = new Set(snake.map(s => `${s.x},${s.y}`));
  let x, y;
  do { x = Math.floor(Math.random() * COLS); y = Math.floor(Math.random() * ROWS); }
  while (occ.has(`${x},${y}`));
  return { x, y };
}

function getMoveInterval(level) {
  return Math.max(0.065, 0.19 - (level - 1) * 0.016);
}

function makeMyState(level = 1, score = 0) {
  const sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
  const snake = [
    { x: sx, y: sy, prevX: sx, prevY: sy },
    { x: sx - 1, y: sy, prevX: sx - 1, prevY: sy },
    { x: sx - 2, y: sy, prevX: sx - 2, prevY: sy },
  ];
  return {
    snake,
    food: randomFood(snake),
    dir: { dx: 1, dy: 0 },
    nextDir: { dx: 1, dy: 0 },
    dirQueue: [],
    score, level,
    foodEaten: 0,
    moveAccum: 0,
    moveInterval: getMoveInterval(level),
    status: 'playing',
    lvlFlash: 0,
  };
}

function makeOppState() {
  const sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
  const snake = [
    { x: sx, y: sy, prevX: sx, prevY: sy },
    { x: sx - 1, y: sy, prevX: sx - 1, prevY: sy },
    { x: sx - 2, y: sy, prevX: sx - 2, prevY: sy },
  ];
  return {
    snake,
    food: randomFood(snake),
    dir: { dx: 1, dy: 0 },
    score: 0, level: 1,
    status: 'playing',
  };
}

function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function fillRRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

export default function OnlineSnakeGame({ socket, room, opponentName }) {
  const canvasRef     = useRef(null);
  const myStateRef    = useRef(null);
  const oppStateRef   = useRef(null);
  const animRef       = useRef(null);
  const lastTRef      = useRef(0);
  const stateBcastRef = useRef(0);
  const resultRef     = useRef(null);
  const myReadyRef    = useRef(false);
  const oppReadyRef   = useRef(false);

  const [result, setResult]               = useState(null);
  const [waitingRestart, setWaitingRestart] = useState(false);

  const CELL = isMobile ? Math.floor(Math.min(window.innerWidth * 0.42, 200) / COLS) : 20;
  const boardW = CELL * COLS;
  const boardH = CELL * ROWS;

  // ── Drawing ──────────────────────────────────────────────────────────────
  const drawBoard = useCallback((ctx, s, ox, oy, t, isOpp) => {
    ctx.save();
    ctx.translate(ox, oy);

    ctx.fillStyle = '#04000e';
    ctx.fillRect(0, 0, boardW, boardH);

    ctx.strokeStyle = isOpp ? 'rgba(255,45,120,0.15)' : 'rgba(0,255,204,0.10)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }

    ctx.strokeStyle = isOpp ? 'rgba(255,45,120,0.40)' : 'rgba(0,255,204,0.40)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, boardW, boardH);

    // Food
    if (s.food) {
      const pulse = 0.72 + 0.28 * Math.sin(performance.now() * 0.006);
      const fcx = s.food.x * CELL + CELL / 2, fcy = s.food.y * CELL + CELL / 2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = isOpp ? '#ff2d78' : '#ffe066'; 
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(fcx, fcy, CELL * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
      const fh = CELL * 0.14;
      ctx.beginPath(); ctx.moveTo(fcx - fh, fcy - fh); ctx.lineTo(fcx + fh, fcy + fh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fcx + fh, fcy - fh); ctx.lineTo(fcx - fh, fcy + fh); ctx.stroke();
    }

    // Snake
    const n = s.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const seg = s.snake[i];
      // se opp, nao interpolar pq nao temos framerate preciso de la, usamos as posicoes exatas (ou poderiamos prever)
      const interT = isOpp ? 1 : Math.min(1, Math.max(0, t));
      const rx = lp(seg.prevX ?? seg.x, seg.x, interT) * CELL + CELL / 2;
      const ry = lp(seg.prevY ?? seg.y, seg.y, interT) * CELL + CELL / 2;
      const isHead = i === 0;
      const ratio = n > 1 ? i / (n - 1) : 0;

      let col;
      if (isOpp) {
        const cr = Math.round(255 * (1 - ratio * 0.5));
        const cg = Math.round(45 * (1 - ratio));
        const cb = Math.round(120 + 80 * ratio);
        col = `rgb(${cr},${cg},${cb})`;
      } else {
        const cr = Math.round(102 * ratio);
        const cg = Math.round(255 * (1 - ratio));
        const cb = Math.round(204 + 51 * ratio);
        col = `rgb(${cr},${cg},${cb})`;
      }

      const pad = isHead ? 1.5 : 2.5;
      const sz = CELL - pad * 2;
      const rad = isHead ? sz * 0.32 : sz * 0.22;

      ctx.fillStyle = col;
      ctx.shadowColor = isHead ? (isOpp ? '#ff2d78' : '#00ffcc') : col;
      ctx.shadowBlur = isHead ? 14 : Math.max(2, (1 - ratio) * 8);
      fillRRect(ctx, rx - sz / 2, ry - sz / 2, sz, sz, rad);

      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#001a10';
        const d = s.dir;
        const eyeR = sz * 0.13;
        const fwd = sz * 0.16, side = sz * 0.20;
        ctx.beginPath();
        ctx.arc(rx + d.dx * fwd - d.dy * side, ry + d.dy * fwd + d.dx * side, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx + d.dx * fwd + d.dy * side, ry + d.dy * fwd - d.dx * side, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    if (s.lvlFlash > 0 && !isOpp) {
      ctx.globalAlpha = Math.min(1, s.lvlFlash * 2);
      ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 28;
      ctx.font = `bold ${Math.round(CELL * 1.2)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${s.level}!`, boardW / 2, boardH / 2);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    ctx.restore();
  }, [CELL, boardH, boardW]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;

    ctx.clearRect(0, 0, W, H);

    const s = myStateRef.current;
    const opp = oppStateRef.current;
    if (!s || !opp) return;

    const gap = isMobile ? 10 : 40;
    const totalW = boardW * 2 + gap;
    const sx = W / 2 - totalW / 2;
    const sy = H / 2 - boardH / 2;

    const myBoardX = sx;
    const oppBoardX = sx + boardW + gap;

    // Draw my board
    drawBoard(ctx, s, myBoardX, sy, s.moveAccum / s.moveInterval, false);
    if (s.status === 'dead' && !resultRef.current) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(myBoardX, sy, boardW, boardH);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${isMobile ? 16 : 24}px Orbitron, sans-serif`;
      ctx.fillText('DIED - SPECTATING', myBoardX + boardW / 2, sy + boardH / 2);
    }
    
    // Draw opp board
    drawBoard(ctx, opp, oppBoardX, sy, 1, true);
    if (opp.status === 'dead' && !resultRef.current) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(oppBoardX, sy, boardW, boardH);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${isMobile ? 16 : 24}px Orbitron, sans-serif`;
      ctx.fillText('OPPONENT DIED', oppBoardX + boardW / 2, sy + boardH / 2);
    }

    // Draw Names & Scores
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${isMobile ? 12 : 16}px Orbitron, sans-serif`;
    
    // My Name
    ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 8;
    ctx.fillText('YOU', myBoardX + boardW / 2, sy - 15);
    // My Score
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
    ctx.fillText(`SCORE: ${s.score}`, myBoardX + boardW / 2, sy + boardH + 25);

    // Opp Name
    ctx.fillStyle = '#ff2d78'; ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 8;
    ctx.fillText(opponentName.toUpperCase(), oppBoardX + boardW / 2, sy - 15);
    // Opp Score
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
    ctx.fillText(`SCORE: ${opp.score}`, oppBoardX + boardW / 2, sy + boardH + 25);

    ctx.restore();

  }, [boardH, boardW, drawBoard, opponentName]);

  // ── Restart Logic ────────────────────────────────────────────────────────
  const doRestart = useCallback(() => {
    myStateRef.current = makeMyState();
    oppStateRef.current = makeOppState();
    lastTRef.current = performance.now();
    resultRef.current = null;
    myReadyRef.current = false;
    oppReadyRef.current = false;
    setResult(null);
    setWaitingRestart(false);
  }, []);

  const handleRestartReady = useCallback(() => {
    myReadyRef.current = true;
    socket.emit('snake-restart-ready', { room });
    if (oppReadyRef.current) {
      doRestart();
    } else {
      setWaitingRestart(true);
    }
  }, [socket, room, doRestart]);

  // ── Effect: mount / unmount ────────────────────────────────────────────────
  const changeDirection = useCallback((key) => {
    const s = myStateRef.current;
    if (!s || s.status !== 'playing' || resultRef.current) return;

    const DIR = {
      ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
      w: { dx: 0, dy: -1 }, s: { dx: 0, dy: 1 }, a: { dx: -1, dy: 0 }, d: { dx: 1, dy: 0 },
    };

    const nd = DIR[key];
    if (!nd) return;
    
    // Get last direction from queue or current dir
    const last = (s.dirQueue && s.dirQueue.length > 0) ? s.dirQueue[s.dirQueue.length - 1] : s.dir;
    
    // Prevent 180 degree turns
    if (nd.dx === -last.dx && nd.dy === -last.dy) return;
    // Prevent redundant moves
    if (nd.dx === last.dx && nd.dy === last.dy) return;

    if (!s.dirQueue) s.dirQueue = [];
    if (s.dirQueue.length < 3) s.dirQueue.push(nd);
  }, []);

  useEffect(() => {
    myStateRef.current  = makeMyState();
    oppStateRef.current = makeOppState();
    lastTRef.current = performance.now();
    resultRef.current   = null;

    const cv = canvasRef.current;
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    // Socket handlers
    const onState = ({ snake, food, score, level, dir }) => {
      const o = oppStateRef.current;
      if (o) { o.snake = snake; o.food = food; o.score = score; o.level = level; o.dir = dir; }
    };
    const checkGameOver = () => {
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

    socket.on('snake-state',         onState);
    socket.on('snake-opp-died',      onOppDied);
    socket.on('snake-opp-left',      onOppLeft);
    socket.on('snake-restart-ready', onRestartReady);

    // Key handlers
    const onKey = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      changeDirection(e.key);
    };
    window.addEventListener('keydown', onKey);

    // Touch swipe
    let tx = 0, ty = 0;
    const onStart = (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onEnd = (e) => {
      if (resultRef.current) return;
      const s = myStateRef.current;
      if (!s || s.status !== 'playing') return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      const nd = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 })
        : (dy > 0 ? { dx: 0, dy: 1 } : { dx: 0, dy: -1 });
      const lastDir = (s.dirQueue && s.dirQueue.length > 0) ? s.dirQueue[s.dirQueue.length - 1] : s.dir;
      if (!(nd.dx === -lastDir.dx && nd.dy === -lastDir.dy) && !(nd.dx === lastDir.dx && nd.dy === lastDir.dy)) {
        if (!s.dirQueue) s.dirQueue = [];
        if (s.dirQueue.length < 3) s.dirQueue.push(nd);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });

    // Game loop
    const loop = (ts) => {
      animRef.current = requestAnimationFrame(loop);
      const s = myStateRef.current;
      
      if (s && s.status === 'playing' && !resultRef.current) {
        const dt = Math.min(0.06, (ts - lastTRef.current) / 1000);
        lastTRef.current = ts;

        if (s.lvlFlash > 0) s.lvlFlash = Math.max(0, s.lvlFlash - dt);

        s.moveAccum += dt;
        if (s.moveAccum >= s.moveInterval) {
          let nd = s.dir;
          if (s.dirQueue && s.dirQueue.length > 0) nd = s.dirQueue[0];

          const head = s.snake[0];
          const newX = head.x + nd.dx;
          const newY = head.y + nd.dy;

          const isDead = 
            newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS ||
            s.snake.slice(1, -1).some(seg => seg.x === newX && seg.y === newY);

          if (isDead) {
            s.graceAccum = (s.graceAccum || 0) + dt;
            if (s.graceAccum > 0.12) {
              s.status = 'dead';
              s.moveAccum = s.moveInterval;
              socket.emit('snake-died', { room, score: s.score });
              checkGameOver();
            }
          } else {
            s.graceAccum = 0;
            if (s.dirQueue && s.dirQueue.length > 0) s.dir = s.dirQueue.shift();

            const atFood = newX === s.food.x && newY === s.food.y;
            const old = s.snake.map(seg => ({ x: seg.x, y: seg.y }));
            s.snake.forEach(seg => { seg.prevX = seg.x; seg.prevY = seg.y; });

            s.snake[0].x = newX;
            s.snake[0].y = newY;

            for (let i = 1; i < s.snake.length; i++) {
              s.snake[i].x = old[i - 1].x;
              s.snake[i].y = old[i - 1].y;
            }

            if (atFood) {
              const ot = old[old.length - 1];
              s.snake.push({ x: ot.x, y: ot.y, prevX: ot.x, prevY: ot.y });
              s.score += 10 * s.level;
              s.foodEaten++;
              s.food = randomFood(s.snake);

              if (s.foodEaten % FOODS_PER_LEVEL === 0) {
                s.level++;
                s.moveInterval = getMoveInterval(s.level);
                s.lvlFlash = 1.4;
              }
            }
            s.moveAccum = 0;
          }
        }
        
        // Broadcast state periodically
        if (ts - stateBcastRef.current > 100) {
          socket.emit('snake-state', { room, snake: s.snake, food: s.food, score: s.score, level: s.level, dir: s.dir });
          stateBcastRef.current = ts;
        }
      } else {
        lastTRef.current = ts;
      }
      render();
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('resize', onResize);
      socket.off('snake-state',         onState);
      socket.off('snake-opp-died',      onOppDied);
      socket.off('snake-opp-left',      onOppLeft);
      socket.off('snake-restart-ready', onRestartReady);
      socket.emit('snake-leave', { room });
    };
  }, [socket, room, render, doRestart, changeDirection]);

  const resultColor = result === 'win' ? '#00ffcc' : result === 'tie' ? '#ffe066' : result === 'opp-left' ? '#ffe066' : '#ff2d78';
  const resultText  = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'YOU LOSE' : result === 'tie' ? 'TIE!' : 'OPPONENT LEFT';

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 10, display: 'block', width: '100%', height: '100%' }} />
      <HomeButton />

      {isMobile && !result && (
        <div style={{ position: 'fixed', bottom: 60, left: 0, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{ pointerEvents: 'auto' }}>
            <SnakeMobileControls onDirectionChange={changeDirection} />
          </div>
        </div>
      )}

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
                { label: 'YOU', score: myStateRef.current?.score ?? 0, color: '#00ffcc' },
                { label: opponentName.substring(0, 10).toUpperCase(), score: oppStateRef.current?.score ?? 0, color: '#ff2d78' },
              ].map(({ label, score, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color, opacity: 0.8, letterSpacing: '0.1em', marginBottom: 8 }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: "'VT323', monospace", fontSize: 42, color: '#fff',
                    textShadow: `0 0 10px ${color}`,
                  }}>
                    {score}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ marginTop: 20 }}>
              <HomeButton />
            </div>

            {result !== 'opp-left' && (
              <button
                onClick={handleRestartReady}
                disabled={waitingRestart}
                style={{
                  padding: '12px 28px',
                  background: waitingRestart ? 'rgba(0,255,204,0.1)' : 'rgba(4,0,18,0.65)',
                  border: `2px solid #00ffcc`,
                  borderRadius: 3,
                  color: waitingRestart ? '#fff' : '#00ffcc',
                  fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', cursor: waitingRestart ? 'default' : 'pointer',
                  transition: 'all 0.16s', textTransform: 'uppercase',
                  boxShadow: waitingRestart ? 'none' : `0 0 12px rgba(0,255,204,0.3)`,
                }}
                onMouseEnter={e => { if (!waitingRestart) { e.currentTarget.style.background = '#00ffcc22'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!waitingRestart) { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = '#00ffcc'; } }}
              >
                {waitingRestart ? 'WAITING...' : 'PLAY AGAIN'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
