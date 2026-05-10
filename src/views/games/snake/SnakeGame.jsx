import { useEffect, useRef } from 'react';
import Leaderboard from '../../../components/shared/Leaderboard';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import isMobile from '../../../utils/isMobile';
import SnakeMobileControls from './SnakeMobileControls';
import { useSnake } from '../../../controllers/snake/useSnake';
import { 
  COLS, ROWS, FOODS_PER_LEVEL, 
  randomFood, getMoveInterval, lp, saveBest, getBest 
} from '../../../models/snake/snakeModel';

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

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTRef = useRef(0);
  const { 
    stateRef, ui, setUi, lbVisible, setLbVisible, 
    sessionToken, restart, changeDirection 
  } = useSnake();

  const CELL = isMobile ? Math.floor(Math.min(window.innerWidth * 0.95, 400) / COLS) : 24;
  const CW = CELL * COLS;
  const CH = CELL * ROWS;

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    if (ui.status === 'dead') {
      setLbVisible(true);
    }
  }, [ui.status, setLbVisible]);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (ui.status === 'dead' && !lbVisible && (e.key === 'Enter' || e.key === ' ')) restart();
      else changeDirection(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDirection, ui.status, lbVisible, restart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw(s, ts) {
      const C = CELL;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#04000e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0,80,160,0.10)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, ROWS * C); ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(COLS * C, y * C); ctx.stroke();
      }

      const pulse = 0.72 + 0.28 * Math.sin(ts * 0.006);
      const fcx = s.food.x * C + C / 2, fcy = s.food.y * C + C / 2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff2d78'; ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(fcx, fcy, C * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
      const fh = C * 0.14;
      ctx.beginPath(); ctx.moveTo(fcx - fh, fcy - fh); ctx.lineTo(fcx + fh, fcy + fh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fcx + fh, fcy - fh); ctx.lineTo(fcx - fh, fcy + fh); ctx.stroke();

      const t = Math.min(1, s.moveAccum / s.moveInterval);
      const n = s.snake.length;
      for (let i = n - 1; i >= 0; i--) {
        const seg = s.snake[i];
        const rx = lp(seg.prevX, seg.x, t) * C + C / 2;
        const ry = lp(seg.prevY, seg.y, t) * C + C / 2;
        const isHead = i === 0;
        const ratio = n > 1 ? i / (n - 1) : 0;
        const col = `rgb(${Math.round(102 * ratio)},${Math.round(255 * (1 - ratio))},${Math.round(204 + 51 * ratio)})`;

        const pad = isHead ? 1.5 : 2.5;
        const sz = C - pad * 2;
        ctx.fillStyle = col;
        ctx.shadowColor = isHead ? '#00ffcc' : col;
        ctx.shadowBlur = isHead ? 14 : Math.max(2, (1 - ratio) * 8);
        fillRRect(ctx, rx - sz / 2, ry - sz / 2, sz, sz, isHead ? sz * 0.32 : sz * 0.22);

        if (isHead) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#001a10';
          const eyeR = sz * 0.13, fwd = sz * 0.16, side = sz * 0.20;
          ctx.beginPath(); ctx.arc(rx + s.dir.dx * fwd - s.dir.dy * side, ry + s.dir.dy * fwd + s.dir.dx * side, eyeR, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(rx + s.dir.dx * fwd + s.dir.dy * side, ry + s.dir.dy * fwd - s.dir.dx * side, eyeR, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      if (s.lvlFlash > 0) {
        ctx.globalAlpha = Math.min(1, s.lvlFlash * 2);
        ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 28;
        ctx.font = `bold ${Math.round(C * 1.2)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${s.level}!`, canvas.width / 2, canvas.height / 2);
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
    }

    function tick(ts) {
      const dt = Math.min(0.06, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      if (s.status === 'dead') { draw(s, ts); animRef.current = requestAnimationFrame(tick); return; }

      if (s.lvlFlash > 0) s.lvlFlash = Math.max(0, s.lvlFlash - dt);
      s.moveAccum += dt;

      if (s.moveAccum >= s.moveInterval) {
        let nd = s.dir;
        if (s.dirQueue?.length > 0) nd = s.dirQueue[0];

        const head = s.snake[0];
        const newX = head.x + nd.dx, newY = head.y + nd.dy;
        const isWall = newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS;
        const isSelf = s.snake.slice(1, -1).some(seg => seg.x === newX && seg.y === newY);

        if (isWall || isSelf) {
          s.graceAccum = (s.graceAccum || 0) + dt;
          if (s.graceAccum > 0.12) {
            saveBest(s.score);
            s.status = 'dead';
            setUi(u => ({ ...u, status: 'dead', score: s.score, best: getBest() }));
          }
        } else {
          s.graceAccum = 0;
          if (s.dirQueue?.length > 0) s.dir = s.dirQueue.shift();
          const atFood = newX === s.food.x && newY === s.food.y;
          const old = s.snake.map(seg => ({ x: seg.x, y: seg.y }));
          s.snake.forEach(seg => { seg.prevX = seg.x; seg.prevY = seg.y; });
          s.snake[0].x = newX; s.snake[0].y = newY;
          for (let i = 1; i < s.snake.length; i++) { s.snake[i].x = old[i - 1].x; s.snake[i].y = old[i - 1].y; }

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
            setUi(u => ({ ...u, level: s.level, score: s.score }));
          }
          s.moveAccum = 0;
        }
      }
      draw(s, ts);
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [CELL, setUi, restart, stateRef]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <HomeButton />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: CW, fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13,
          color: '#fff', letterSpacing: '0.08em', padding: '0 4px', boxSizing: 'border-box',
        }}>
          <div><span style={{ color: '#00ffcc', textShadow: '0 0 10px #00ffcc' }}>SCORE </span><span>{ui.score}</span></div>
          <div style={{ color: '#cc00ff', textShadow: '0 0 10px #cc00ff' }}>LVL {ui.level}</div>
          <div><span style={{ color: '#ffe066', textShadow: '0 0 8px #ffcc00' }}>BEST </span><span>{ui.best}</span></div>
        </div>
        <div style={{ border: '2px solid rgba(0,255,180,0.30)', borderRadius: 4, boxShadow: '0 0 32px rgba(0,255,160,0.16), inset 0 0 24px rgba(0,0,40,0.85)', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} />
        </div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {isMobile ? '' : 'WASD / ARROW KEYS'}
        </div>
        {isMobile && <SnakeMobileControls onDirectionChange={changeDirection} />}
      </div>
      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/snake`}
        score={ui.score}
        sessionToken={sessionToken}
        onPlayAgain={restart}
        visible={lbVisible}
      />
    </div>
  );
}
