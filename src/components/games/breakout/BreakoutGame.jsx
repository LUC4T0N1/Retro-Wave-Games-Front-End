import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Leaderboard from '../../ui/Leaderboard'; // Importado
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

const BASE_W = 480;
const BASE_H = 560;
const BRICK_COLS = 9;
const BRICK_GAP = 5;
const BRICK_H = 18;
const BRICK_TOP = 70;
const PADDLE_H = 12;
const BALL_R = 7;
const LIVES_START = 3;

const ROW_COLORS = [
  '#ff00aa', '#ff2d78', '#ff6622', '#ffb852',
  '#ffee00', '#00ffcc', '#00e5ff', '#cc00ff', '#7700ff',
];

function getBallSpeed(level) { return Math.min(520, 240 + (level - 1) * 32); }
function getPaddleW(level) { return Math.max(58, 108 - (level - 1) * 6); }
function getPaddleY() { return BASE_H - 44; }
function getBrickW() { return (BASE_W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS; }

function buildBricks(level) {
  const rows = Math.min(3 + level, 9);
  const brickW = getBrickW();
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const hp = r < 2 && level >= 4 ? 2 : 1;
    const color = ROW_COLORS[r % ROW_COLORS.length];
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_GAP + c * (brickW + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        w: brickW, h: BRICK_H,
        hp, maxHp: hp, color, alive: true,
      });
    }
  }
  return bricks;
}

function buildState(level = 1, score = 0, lives = LIVES_START) {
  const pw = getPaddleW(level);
  const px = BASE_W / 2 - pw / 2;
  const py = getPaddleY();
  return {
    level, score, lives,
    paddle: { x: px, y: py, w: pw, h: PADDLE_H },
    ball: { x: BASE_W / 2, y: py - BALL_R - 1, vx: 0, vy: 0 },
    bricks: buildBricks(level),
    launched: false,
    status: 'idle', // idle | playing | dead | win | gameover | levelcomplete
  };
}

function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function fillRRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function getBest() { return parseInt(localStorage.getItem('breakoutBest') || '0'); }
function saveBest(s) { if (s > getBest()) localStorage.setItem('breakoutBest', String(s)); }

export default function BreakoutGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(buildState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const lastTRef = useRef(null);
  const scaleRef = useRef(1);
  const trailRef = useRef([]);
  const sessionTokenRef = useRef(null);
  const lbVisibleRef = useRef(false);

  const [ui, setUi] = useState({ status: 'idle', score: 0, level: 1, lives: LIVES_START, best: getBest() });
  const [lbVisible, setLbVisible] = useState(false);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/breakout/session`, {
        method: 'POST',
      });
      const json = await res.json();
      sessionTokenRef.current = json.sessionToken || null;
    } catch {
      sessionTokenRef.current = null;
    }
  }, []);

  const syncUi = useCallback(() => {
    const s = stateRef.current;
    setUi({ status: s.status, score: s.score, level: s.level, lives: s.lives, best: getBest() });
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = buildState(1, 0, LIVES_START);
    stateRef.current.status = 'idle';
    trailRef.current = [];
    setLbVisible(false);
    lbVisibleRef.current = false;
    requestSession();
    syncUi();
  }, [requestSession, syncUi]);

  useEffect(() => {
    requestSession();
  }, [requestSession]);

  useEffect(() => {
    if (ui.status === 'gameover') {
      setLbVisible(true);
      lbVisibleRef.current = true;
    }
  }, [ui.status]);

  // ── draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback((ctx, scale) => {
    const s = stateRef.current;
    const W = BASE_W * scale;
    const H = BASE_H * scale;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(5,0,16,0.82)';
    fillRRect(ctx, 0, 0, W, H, 12 * scale);

    ctx.save();
    ctx.strokeStyle = '#cc00ff';
    ctx.lineWidth = 2 * scale;
    ctx.shadowColor = '#cc00ff';
    ctx.shadowBlur = 14 * scale;
    ctx.strokeRect(1 * scale, 1 * scale, W - 2 * scale, H - 2 * scale);
    ctx.restore();

    for (const b of s.bricks) {
      if (!b.alive) continue;
      const ratio = b.hp / b.maxHp;
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.4 + 0.6 * ratio;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8 * scale;
      fillRRect(ctx, b.x * scale, b.y * scale, b.w * scale, b.h * scale, 3 * scale);
      if (b.maxHp > 1 && b.hp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.shadowBlur = 0;
        fillRRect(ctx, (b.x + 4) * scale, (b.y + 3) * scale, (b.w - 8) * scale, 3 * scale, 1 * scale);
      }
      ctx.restore();
    }

    for (let i = 0; i < trailRef.current.length; i++) {
      const tr = trailRef.current[i];
      const a = (i / trailRef.current.length) * 0.35;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 10 * scale;
      ctx.beginPath();
      ctx.arc(tr.x * scale, tr.y * scale, BALL_R * scale * (0.5 + 0.5 * (i / trailRef.current.length)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 18 * scale;
    ctx.beginPath();
    ctx.arc(s.ball.x * scale, s.ball.y * scale, BALL_R * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pd = s.paddle;
    ctx.save();
    ctx.fillStyle = '#ff2d78';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 20 * scale;
    fillRRect(ctx, pd.x * scale, pd.y * scale, pd.w * scale, pd.h * scale, 6 * scale);
    ctx.restore();

    if (s.status === 'idle') {
      ctx.save();
      ctx.fillStyle = 'rgba(5,0,16,0.55)';
      ctx.fillRect(0, BASE_H * scale * 0.38, W, 80 * scale);
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 16 * scale;
      ctx.font = `bold ${22 * scale}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(isMobile ? 'TAP TO LAUNCH' : 'CLICK OR SPACE TO LAUNCH', W / 2, BASE_H * scale * 0.48);
      ctx.restore();
    }
    if (s.status === 'levelcomplete') {
      ctx.save();
      ctx.fillStyle = 'rgba(5,0,16,0.70)';
      ctx.fillRect(0, BASE_H * scale * 0.36, W, 100 * scale);
      ctx.fillStyle = '#ffb852';
      ctx.shadowColor = '#ffb852';
      ctx.shadowBlur = 20 * scale;
      ctx.font = `bold ${26 * scale}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${s.level} CLEAR!`, W / 2, BASE_H * scale * 0.46);
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.font = `${16 * scale}px 'Courier New', monospace`;
      ctx.fillText('GET READY...', W / 2, BASE_H * scale * 0.53);
      ctx.restore();
    }
  }, []);

  // ── tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback((ts) => {
    if (lastTRef.current === null) lastTRef.current = ts;
    const rawDt = Math.min((ts - lastTRef.current) / 1000, 0.05);
    lastTRef.current = ts;

    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = scaleRef.current;

    if (s.status === 'playing') {
      const spd = getBallSpeed(s.level);
      let { x, y, vx, vy } = s.ball;
      const pd = s.paddle;

      const pdSpd = 420;
      if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
        pd.x = Math.max(0, pd.x - pdSpd * rawDt);
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
        pd.x = Math.min(BASE_W - pd.w, pd.x + pdSpd * rawDt);
      }

      const steps = 3;
      const dt = rawDt / steps;
      let dead = false;
      let uiNeedsSync = false;
      for (let step = 0; step < steps && !dead; step++) {
        x += vx * spd * dt;
        y += vy * spd * dt;

        if (x - BALL_R < 0) { x = BALL_R; vx = Math.abs(vx); }
        if (x + BALL_R > BASE_W) { x = BASE_W - BALL_R; vx = -Math.abs(vx); }
        if (y - BALL_R < 0) { y = BALL_R; vy = Math.abs(vy); }

        if (
          vy > 0 &&
          y + BALL_R >= pd.y &&
          y - BALL_R <= pd.y + pd.h &&
          x >= pd.x - BALL_R &&
          x <= pd.x + pd.w + BALL_R
        ) {
          y = pd.y - BALL_R;
          vy = -Math.abs(vy);
          const rel = (x - (pd.x + pd.w / 2)) / (pd.w / 2);
          vx = rel * 1.2;
          const len = Math.sqrt(vx * vx + vy * vy);
          vx /= len; vy /= len;
        }

        for (const b of s.bricks) {
          if (!b.alive) continue;
          const ol = x + BALL_R - b.x;
          const or = b.x + b.w - (x - BALL_R);
          const ot = y + BALL_R - b.y;
          const ob = b.y + b.h - (y - BALL_R);
          if (ol > 0 && or > 0 && ot > 0 && ob > 0) {
            b.hp--;
            if (b.hp <= 0) {
              b.alive = false;
              s.score += 10 * s.level;
              saveBest(s.score);
              uiNeedsSync = true;
            }
            const minO = Math.min(ol, or, ot, ob);
            if (minO === ot || minO === ob) vy = -vy;
            else vx = -vx;
            break;
          }
        }

        if (y - BALL_R > BASE_H) {
          dead = true;
        }
      }

      if (uiNeedsSync) syncUi();

      s.ball.x = x; s.ball.y = y; s.ball.vx = vx; s.ball.vy = vy;

      trailRef.current.push({ x, y });
      if (trailRef.current.length > 10) trailRef.current.shift();

      if (dead) {
        s.lives--;
        trailRef.current = [];
        if (s.lives <= 0) {
          s.status = 'gameover';
          saveBest(s.score);
          syncUi();
        } else {
          const pw = getPaddleW(s.level);
          s.paddle.x = BASE_W / 2 - pw / 2;
          s.ball.x = BASE_W / 2;
          s.ball.y = getPaddleY() - BALL_R - 1;
          s.ball.vx = 0; s.ball.vy = 0;
          s.launched = false;
          s.status = 'idle';
          syncUi();
        }
      } else {
        if (s.bricks.every(b => !b.alive)) {
          s.status = 'levelcomplete';
          syncUi();
          setTimeout(() => {
            const next = s.level + 1;
            const score = stateRef.current.score;
            const lives = stateRef.current.lives;
            stateRef.current = buildState(next, score, lives);
            stateRef.current.status = 'idle';
            trailRef.current = [];
            syncUi();
          }, 2200);
        }
      }
    }

    draw(ctx, scale);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, syncUi]);

  // ── launch ball ───────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'idle') return;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    s.ball.vx = Math.cos(angle);
    s.ball.vy = Math.sin(angle);
    s.launched = true;
    s.status = 'playing';
    syncUi();
  }, [syncUi]);

  // ── mouse / touch controls ────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || lbVisibleRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    const mx = (e.clientX - rect.left) / scale;
    const s = stateRef.current;
    s.paddle.x = Math.max(0, Math.min(BASE_W - s.paddle.w, mx - s.paddle.w / 2));
    if (!s.launched) {
      s.ball.x = s.paddle.x + s.paddle.w / 2;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (lbVisibleRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    const mx = (e.touches[0].clientX - rect.left) / scale;
    const s = stateRef.current;
    s.paddle.x = Math.max(0, Math.min(BASE_W - s.paddle.w, mx - s.paddle.w / 2));
    if (!s.launched) {
      s.ball.x = s.paddle.x + s.paddle.w / 2;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!lbVisibleRef.current) launch();
  }, [launch]);

  const handleKeyDown = useCallback((e) => {
    if (lbVisibleRef.current) return;
    keysRef.current[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') launch();
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  }, [launch]);

  const handleKeyUp = useCallback((e) => {
    keysRef.current[e.key] = false;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = Math.min(window.innerWidth * 0.96, BASE_W);
    const maxH = window.innerHeight * 0.82;
    const scale = Math.min(maxW / BASE_W, maxH / BASE_H, 1);
    scaleRef.current = scale;
    canvas.width = BASE_W * scale;
    canvas.height = BASE_H * scale;
    canvas.style.width = `${BASE_W * scale}px`;
    canvas.style.height = `${BASE_H * scale}px`;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resize, handleKeyDown, handleKeyUp, tick]);

  const s = ui;
  const hearts = Array.from({ length: LIVES_START }, (_, i) => i < s.lives ? '♥' : '♡');

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 0', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
        <HomeButton />
        <span style={{ color: '#ffb852', fontFamily: "'Courier New', monospace", fontSize: 22, fontWeight: 'bold', letterSpacing: 4, textShadow: '0 0 12px #ffb852' }}>BREAKOUT</span>
        <span style={{ color: '#ff2d78', fontFamily: "'Courier New', monospace", fontSize: 14, letterSpacing: 1, textShadow: '0 0 8px #ff2d78' }}>BEST {getBest()}</span>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '8px 0 6px', position: 'relative', zIndex: 10 }}>
        <span style={{ color: '#00ffcc', fontFamily: "'Courier New', monospace", fontSize: 15, textShadow: '0 0 8px #00ffcc' }}>SCORE {s.score}</span>
        <span style={{ color: '#cc00ff', fontFamily: "'Courier New', monospace", fontSize: 15, textShadow: '0 0 8px #cc00ff' }}>LV {s.level}</span>
        <span style={{ color: '#ff2d78', fontFamily: "'Courier New', monospace", fontSize: 18, textShadow: '0 0 10px #ff2d78', letterSpacing: 3 }}>{hearts.join(' ')}</span>
      </div>

      <div style={{ position: 'relative', zIndex: 10, cursor: 'none' }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchStart={(e) => { handleTouchMove(e); launch(); }}
          style={{ display: 'block', borderRadius: 12, touchAction: 'none' }}
        />
      </div>

      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/breakout`}
        score={ui.score}
        sessionToken={sessionTokenRef.current}
        onPlayAgain={startGame}
        visible={lbVisible}
      />
    </div>
  );
}