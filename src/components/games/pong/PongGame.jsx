import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

// ── Constants ─────────────────────────────────────────────────────────────
const LW = 800, LH = 480;
const BALL_R = 8;
const PAD_W = 14, PAD_H = 92;
const PAD_MARGIN = 28;
const WIN_SCORE = 7;
const INIT_SPEED = 6.5;
const MAX_SPEED = 16;
const SPD_PER_HIT = 0.42;
const COUNTDOWN_SEC = 1.8;
const PLAYER_SPD = 7.5;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60°

const AI_CFG = {
  easy:   { maxSpd: 2.6,  noise: 42, lagFrames: 14 },
  medium: { maxSpd: 5.0,  noise: 15, lagFrames: 4  },
  hard:   { maxSpd: 9.5,  noise: 3,  lagFrames: 0  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function newBall(dir) {
  const angle = Math.PI / 9 + Math.random() * (Math.PI / 6); // 20–50°
  const ys = Math.random() < 0.5 ? 1 : -1;
  return {
    x: LW / 2, y: LH / 2, prevX: LW / 2,
    vx: INIT_SPEED * dir * Math.cos(angle),
    vy: INIT_SPEED * ys  * Math.sin(angle),
    spd: INIT_SPEED, hits: 0,
  };
}

function initState() {
  return {
    ball: newBall(Math.random() < 0.5 ? 1 : -1),
    pY: (LH - PAD_H) / 2,
    aY: (LH - PAD_H) / 2,
    aTarget: LH / 2,
    aLag: 0,
    pScore: 0,
    aScore: 0,
    phase: 'countdown',
    cdown: COUNTDOWN_SEC,
    winner: null,
    tick: 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────
function PongGame() {
  const { difficulty } = useParams();
  const isLocal = difficulty === 'local';
  const diff = !isLocal && AI_CFG[difficulty] ? difficulty : 'medium';
  const cfg  = AI_CFG[diff];

  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const animRef   = useRef(null);
  const lastTRef  = useRef(0);
  const inputRef  = useRef({ up: false, down: false, up2: false, down2: false, touchY: null });

  const [, setUi] = useState({ pScore: 0, aScore: 0, phase: 'countdown', winner: null });

  const scale = isMobile
    ? Math.min((window.innerWidth * 0.98) / LW, (window.innerHeight * 0.78) / LH)
    : 1;
  const DW = Math.round(LW * scale);
  const DH = Math.round(LH * scale);

  const restart = useCallback(() => {
    stateRef.current = initState();
    setUi({ pScore: 0, aScore: 0, phase: 'countdown', winner: null });
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      if (['w', 'W'].includes(e.key)) { e.preventDefault(); inputRef.current.up   = true; }
      if (['s', 'S'].includes(e.key)) { e.preventDefault(); inputRef.current.down = true; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); if (isLocal) inputRef.current.up2   = true; else inputRef.current.up   = true; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (isLocal) inputRef.current.down2 = true; else inputRef.current.down = true; }
      if ([' ', 'Enter'].includes(e.key) && stateRef.current?.phase === 'gameover') restart();
    };
    const onUp = (e) => {
      if (['w', 'W'].includes(e.key)) inputRef.current.up   = false;
      if (['s', 'S'].includes(e.key)) inputRef.current.down = false;
      if (e.key === 'ArrowUp')   { if (isLocal) inputRef.current.up2   = false; else inputRef.current.up   = false; }
      if (e.key === 'ArrowDown') { if (isLocal) inputRef.current.down2 = false; else inputRef.current.down = false; }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [restart, isLocal]);

  // ── Touch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getY = (e) => ((e.touches[0]?.clientY ?? 0) - canvas.getBoundingClientRect().top) / scale;
    const onStart = (e) => {
      e.preventDefault();
      if (stateRef.current?.phase === 'gameover') restart();
      inputRef.current.touchY = getY(e);
    };
    const onMove = (e) => { e.preventDefault(); inputRef.current.touchY = getY(e); };
    const onEnd  = () => { inputRef.current.touchY = null; };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onEnd);
    };
  }, [scale, restart]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initState();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Draw helpers ─────────────────────────────────────────────────────────
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawCenterLine() {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,0,255,0.28)';
      ctx.shadowColor = '#c200ff'; ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 14]);
      ctx.beginPath(); ctx.moveTo(LW / 2, 0); ctx.lineTo(LW / 2, LH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawPaddle(x, y, color) {
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 26;
      rr(x, y, PAD_W, PAD_H, 4);
      ctx.fillStyle = color; ctx.fill();
      // Inner highlight
      ctx.globalAlpha = 0.30;
      rr(x + 2, y + 4, PAD_W - 4, PAD_H - 8, 3);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }

    function drawBall(b, tick) {
      ctx.save();
      // Trail
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.07 * (4 - i);
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(b.x - b.vx * i * 0.9, b.y - b.vy * i * 0.9, BALL_R * (1 - i * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 16 + 6 * Math.sin(tick * 0.09);
      const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, BALL_R);
      g.addColorStop(0,   '#ffffff');
      g.addColorStop(0.4, '#ffe066');
      g.addColorStop(1,   'rgba(255,136,0,0.6)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawScores(pScore, aScore, leftLabel, rightLabel) {
      ctx.save();
      ctx.font = "72px 'VT323', monospace";
      ctx.textBaseline = 'top';

      ctx.font = "11px 'Orbitron', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0,229,255,0.45)';
      ctx.fillText(leftLabel, LW / 2 - 14, 12);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,45,120,0.45)';
      ctx.fillText(rightLabel, LW / 2 + 14, 12);

      ctx.font = "72px 'VT323', monospace";
      ctx.textAlign = 'right';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(pScore, LW / 2 - 10, 24);

      ctx.textAlign = 'left';
      ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#ff2d78';
      ctx.fillText(aScore, LW / 2 + 10, 24);

      // First-to indicator
      ctx.font = "9px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillText(`FIRST TO ${WIN_SCORE}`, LW / 2, 100);
      ctx.restore();
    }

    function drawCountdown(cdown) {
      const num = Math.ceil(cdown);
      const pulse = cdown % 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.35 + pulse * 0.65);
      ctx.font = "bold 88px 'VT323', monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 28;
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(num, LW / 2, LH / 2 + 50);
      ctx.restore();
    }

    function drawGameOver(winner, isLocalMode) {
      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH);
      ctx.globalAlpha = 1;

      const won = winner === 'player';
      const col  = won ? '#00ffcc' : '#ff2d78';
      const label = isLocalMode
        ? (won ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!')
        : (won ? 'YOU WIN!' : 'GAME OVER');

      ctx.shadowColor = col; ctx.shadowBlur = 50;
      ctx.font = "bold 68px 'Orbitron', sans-serif";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      ctx.fillText(label, LW / 2, LH / 2 - 30);

      ctx.shadowBlur = 0;
      ctx.font = "13px 'Orbitron', sans-serif";
      ctx.fillStyle = 'rgba(255,255,255,0.50)';
      ctx.fillText(isMobile ? 'TAP TO PLAY AGAIN' : 'PRESS SPACE TO PLAY AGAIN', LW / 2, LH / 2 + 28);
      ctx.restore();
    }

    // ── AI ────────────────────────────────────────────────────────────────────
    function predictY(b) {
      if (b.vx <= 0) return null;
      const targetX = LW - PAD_MARGIN - BALL_R;
      let x = b.x, y = b.y;
      const vyr = b.vy / b.vx; // vy per unit x
      let count = 0;
      while (x < targetX && count++ < 1800) {
        x++;
        y += vyr;
        if (y < BALL_R)        { y = BALL_R * 2 - y;             }
        if (y > LH - BALL_R)   { y = (LH - BALL_R) * 2 - y;     }
      }
      return y;
    }

    function updateAI(s, dt_60) {
      s.aLag -= dt_60;
      if (s.aLag <= 0) {
        s.aLag = cfg.lagFrames;
        const py = predictY(s.ball);
        s.aTarget = py !== null
          ? py + (Math.random() - 0.5) * 2 * cfg.noise
          : LH / 2;
      }
      const center = s.aY + PAD_H / 2;
      const delta  = s.aTarget - center;
      const move   = Math.sign(delta) * Math.min(cfg.maxSpd * dt_60, Math.abs(delta));
      s.aY = Math.max(0, Math.min(LH - PAD_H, s.aY + move));
    }

    // ── Update ────────────────────────────────────────────────────────────────
    function update(dt, s) {
      const dt_60 = dt * 60;
      s.tick++;

      // Player 1 (left) paddle — W/S
      const inp = inputRef.current;
      if (inp.touchY !== null) {
        s.pY = Math.max(0, Math.min(LH - PAD_H, inp.touchY - PAD_H / 2));
      } else {
        if (inp.up)   s.pY = Math.max(0,          s.pY - PLAYER_SPD * dt_60);
        if (inp.down) s.pY = Math.min(LH - PAD_H, s.pY + PLAYER_SPD * dt_60);
      }

      if (s.phase === 'gameover') return;

      if (s.phase === 'countdown') {
        s.cdown -= dt;
        if (s.cdown <= 0) s.phase = 'playing';
        return;
      }

      // Player 2 (local) — arrow keys, or AI
      if (isLocal) {
        if (inp.up2)   s.aY = Math.max(0,          s.aY - PLAYER_SPD * dt_60);
        if (inp.down2) s.aY = Math.min(LH - PAD_H, s.aY + PLAYER_SPD * dt_60);
      } else {
        updateAI(s, dt_60);
      }

      // Ball movement
      const b = s.ball;
      b.prevX = b.x;
      b.x += b.vx * dt_60;
      b.y += b.vy * dt_60;

      // Top / bottom walls
      if (b.y - BALL_R <= 0)  { b.y = BALL_R;      b.vy =  Math.abs(b.vy); }
      if (b.y + BALL_R >= LH) { b.y = LH - BALL_R; b.vy = -Math.abs(b.vy); }

      // Player paddle (left face)
      const pRight = PAD_MARGIN + PAD_W;
      if (b.vx < 0
          && b.prevX - BALL_R >= pRight
          && b.x    - BALL_R  < pRight
          && b.y >= s.pY - BALL_R * 0.4
          && b.y <= s.pY + PAD_H + BALL_R * 0.4) {
        b.x = pRight + BALL_R;
        b.hits++;
        b.spd = Math.min(MAX_SPEED, INIT_SPEED + b.hits * SPD_PER_HIT);
        const rel = (b.y - (s.pY + PAD_H / 2)) / (PAD_H / 2); // -1 to 1
        const ang = rel * MAX_BOUNCE_ANGLE;
        b.vx =  Math.cos(ang) * b.spd;
        b.vy =  Math.sin(ang) * b.spd;
      }

      // AI paddle (left face of right paddle)
      const aLeft = LW - PAD_MARGIN - PAD_W;
      if (b.vx > 0
          && b.prevX + BALL_R <= aLeft
          && b.x    + BALL_R  > aLeft
          && b.y >= s.aY - BALL_R * 0.4
          && b.y <= s.aY + PAD_H + BALL_R * 0.4) {
        b.x = aLeft - BALL_R;
        b.hits++;
        b.spd = Math.min(MAX_SPEED, INIT_SPEED + b.hits * SPD_PER_HIT);
        const rel = (b.y - (s.aY + PAD_H / 2)) / (PAD_H / 2);
        const ang = rel * MAX_BOUNCE_ANGLE;
        b.vx = -Math.cos(ang) * b.spd;
        b.vy =  Math.sin(ang) * b.spd;
      }

      // Scoring
      if (b.x - BALL_R < 0) {
        s.aScore++;
        if (s.aScore >= WIN_SCORE) {
          s.phase = 'gameover'; s.winner = 'ai';
        } else {
          s.ball = newBall(-1); s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC;
        }
        setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner });
        return;
      }
      if (b.x + BALL_R > LW) {
        s.pScore++;
        if (s.pScore >= WIN_SCORE) {
          s.phase = 'gameover'; s.winner = 'player';
        } else {
          s.ball = newBall(1); s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC;
        }
        setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner });
        return;
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw(s) {
      ctx.clearRect(0, 0, LW, LH);
      drawCenterLine();
      drawPaddle(PAD_MARGIN, s.pY, '#00e5ff');
      drawPaddle(LW - PAD_MARGIN - PAD_W, s.aY, '#ff2d78');
      if (s.phase !== 'gameover') drawBall(s.ball, s.tick);
      drawScores(s.pScore, s.aScore, isLocal ? 'P1' : 'YOU', isLocal ? 'P2' : 'CPU');
      if (s.phase === 'countdown') drawCountdown(s.cdown);
      if (s.phase === 'gameover')  drawGameOver(s.winner, isLocal);
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      update(dt, s);
      draw(s);
      if (s.tick % 4 === 0) {
        setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner });
      }
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const diffLabel = isLocal ? 'LOCAL' : ({ easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }[diff] ?? 'MEDIUM');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      {/* Difficulty label */}
      <div style={{
        position: 'absolute', top: 22, right: 24, zIndex: 20,
        fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
      }}>
        PONG — {diffLabel}
      </div>

      {/* Game area */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          border: '2px solid rgba(180,0,255,0.38)',
          borderRadius: 4,
          boxShadow: '0 0 36px rgba(180,0,255,0.20), 0 0 72px rgba(100,0,255,0.10), inset 0 0 28px rgba(0,0,40,0.88)',
          overflow: 'hidden',
        }}>
          <canvas ref={canvasRef} width={LW} height={LH} style={{ display: 'block', width: DW, height: DH }} />
        </div>

        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 14,
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          {isLocal ? 'W / S — P1   •   ↑ / ↓ — P2' : (isMobile ? 'DRAG TO MOVE PADDLE' : 'W / ↑ — UP   •   S / ↓ — DOWN')}
        </div>
      </div>
    </div>
  );
}

export default PongGame;
