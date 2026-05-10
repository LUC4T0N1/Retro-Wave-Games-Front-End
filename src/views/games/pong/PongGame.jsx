import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import ControlsLegend from '../../../components/shared/ControlsLegend';
import { usePong } from '../../../controllers/pong/usePong';
import { 
  LW, LH, BALL_R, PAD_W, PAD_H, PAD_MARGIN, WIN_SCORE, 
  INIT_SPEED, MAX_SPEED, SPD_PER_HIT, COUNTDOWN_SEC, 
  PLAYER_SPD, MAX_BOUNCE_ANGLE, AI_CFG, newBall 
} from '../../../models/pong/pongModel';

export default function PongGame() {
  const { difficulty } = useParams();
  const isLocal = difficulty === 'local';
  const diff = !isLocal && AI_CFG[difficulty] ? difficulty : 'medium';
  const cfg = AI_CFG[diff];

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTRef = useRef(0);
  const { stateRef, inputRef, ui, setUi, restart } = usePong();

  const scale = isMobile ? Math.min((window.innerWidth * 0.98) / LW, (window.innerHeight * 0.78) / LH) : 1;
  const DW = Math.round(LW * scale), DH = Math.round(LH * scale);

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    const onDown = (e) => {
      if (['w', 'W'].includes(e.key)) { e.preventDefault(); inputRef.current.up = true; }
      if (['s', 'S'].includes(e.key)) { e.preventDefault(); inputRef.current.down = true; }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (isLocal) inputRef.current.up2 = true; else inputRef.current.up = true; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (isLocal) inputRef.current.down2 = true; else inputRef.current.down = true; }
      if ([' ', 'Enter'].includes(e.key) && stateRef.current?.phase === 'gameover') restart();
    };
    const onUp = (e) => {
      if (['w', 'W'].includes(e.key)) inputRef.current.up = false;
      if (['s', 'S'].includes(e.key)) inputRef.current.down = false;
      if (e.key === 'ArrowUp') { if (isLocal) inputRef.current.up2 = false; else inputRef.current.up = false; }
      if (e.key === 'ArrowDown') { if (isLocal) inputRef.current.down2 = false; else inputRef.current.down = false; }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [restart, isLocal, inputRef, stateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getY = (e) => ((e.touches[0]?.clientY ?? 0) - canvas.getBoundingClientRect().top) / scale;
    const onStart = (e) => { e.preventDefault(); if (stateRef.current?.phase === 'gameover') restart(); inputRef.current.touchY = getY(e); };
    const onMove = (e) => { e.preventDefault(); inputRef.current.touchY = getY(e); };
    const onEnd = () => { inputRef.current.touchY = null; };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
    return () => { canvas.removeEventListener('touchstart', onStart); canvas.removeEventListener('touchmove', onMove); canvas.removeEventListener('touchend', onEnd); };
  }, [scale, restart, inputRef, stateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function drawCenterLine() { ctx.save(); ctx.strokeStyle = 'rgba(180,0,255,0.28)'; ctx.shadowColor = '#c200ff'; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.setLineDash([14, 14]); ctx.beginPath(); ctx.moveTo(LW / 2, 0); ctx.lineTo(LW / 2, LH); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    function drawPaddle(x, y, color) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 26; rr(x, y, PAD_W, PAD_H, 4); ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 0.30; rr(x + 2, y + 4, PAD_W - 4, PAD_H - 8, 3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
    function drawBall(b, tick) { ctx.save(); for (let i = 3; i >= 1; i--) { ctx.globalAlpha = 0.07 * (4 - i); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(b.x - b.vx * i * 0.9, b.y - b.vy * i * 0.9, BALL_R * (1 - i * 0.1), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 16 + 6 * Math.sin(tick * 0.09); const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, BALL_R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ffe066'); g.addColorStop(1, 'rgba(255,136,0,0.6)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    function drawCountdown(cdown) { const num = Math.ceil(cdown), pulse = cdown % 1; ctx.save(); ctx.globalAlpha = Math.min(1, 0.35 + pulse * 0.65); ctx.font = "bold 88px 'VT323', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 28; ctx.fillStyle = '#00e5ff'; ctx.fillText(num, LW / 2, LH / 2 + 50); ctx.restore(); }
    function drawGameOver(winner, isLocalMode) { ctx.save(); ctx.globalAlpha = 0.62; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH); ctx.globalAlpha = 1; const won = winner === 'player', col = won ? '#00ffcc' : '#ff2d78', label = isLocalMode ? (won ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!') : (won ? 'YOU WIN!' : 'GAME OVER'); ctx.shadowColor = col; ctx.shadowBlur = 50; ctx.font = "bold 68px 'Orbitron', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(label, LW / 2, LH / 2 - 30); ctx.shadowBlur = 0; ctx.font = "13px 'Orbitron', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.fillText(isMobile ? 'TAP TO PLAY AGAIN' : 'PRESS SPACE TO PLAY AGAIN', LW / 2, LH / 2 + 28); ctx.restore(); }

    function predictY(b) { if (b.vx <= 0) return null; const targetX = LW - PAD_MARGIN - BALL_R; let x = b.x, y = b.y; const vyr = b.vy / b.vx; let count = 0; while (x < targetX && count++ < 1800) { x++; y += vyr; if (y < BALL_R) y = BALL_R * 2 - y; if (y > LH - BALL_R) y = (LH - BALL_R) * 2 - y; } return y; }
    function updateAI(s, dt_60) { s.aLag -= dt_60; if (s.aLag <= 0) { s.aLag = cfg.lagFrames; const py = predictY(s.ball); s.aTarget = py !== null ? py + (Math.random() - 0.5) * 2 * cfg.noise : LH / 2; } const center = s.aY + PAD_H / 2, delta = s.aTarget - center, move = Math.sign(delta) * Math.min(cfg.maxSpd * dt_60, Math.abs(delta)); s.aY = Math.max(0, Math.min(LH - PAD_H, s.aY + move)); }

    function update(dt, s) {
      const dt_60 = dt * 60; s.tick++;
      const inp = inputRef.current; if (inp.touchY !== null) s.pY = Math.max(0, Math.min(LH - PAD_H, inp.touchY - PAD_H / 2)); else { if (inp.up) s.pY = Math.max(0, s.pY - PLAYER_SPD * dt_60); if (inp.down) s.pY = Math.min(LH - PAD_H, s.pY + PLAYER_SPD * dt_60); }
      if (s.phase === 'gameover') return; if (s.phase === 'countdown') { s.cdown -= dt; if (s.cdown <= 0) s.phase = 'playing'; return; }
      if (isLocal) { if (inp.up2) s.aY = Math.max(0, s.aY - PLAYER_SPD * dt_60); if (inp.down2) s.aY = Math.min(LH - PAD_H, s.aY + PLAYER_SPD * dt_60); } else updateAI(s, dt_60);
      const b = s.ball; b.prevX = b.x; b.x += b.vx * dt_60; b.y += b.vy * dt_60;
      if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); } if (b.y + BALL_R >= LH) { b.y = LH - BALL_R; b.vy = -Math.abs(b.vy); }
      const pRight = PAD_MARGIN + PAD_W; if (b.vx < 0 && b.prevX - BALL_R >= pRight && b.x - BALL_R < pRight && b.y >= s.pY - BALL_R * 0.4 && b.y <= s.pY + PAD_H + BALL_R * 0.4) { b.x = pRight + BALL_R; b.hits++; b.spd = Math.min(MAX_SPEED, INIT_SPEED + b.hits * SPD_PER_HIT); const rel = (b.y - (s.pY + PAD_H / 2)) / (PAD_H / 2), ang = rel * MAX_BOUNCE_ANGLE; b.vx = Math.cos(ang) * b.spd; b.vy = Math.sin(ang) * b.spd; }
      const aLeft = LW - PAD_MARGIN - PAD_W; if (b.vx > 0 && b.prevX + BALL_R <= aLeft && b.x + BALL_R > aLeft && b.y >= s.aY - BALL_R * 0.4 && b.y <= s.aY + PAD_H + BALL_R * 0.4) { b.x = aLeft - BALL_R; b.hits++; b.spd = Math.min(MAX_SPEED, INIT_SPEED + b.hits * SPD_PER_HIT); const rel = (b.y - (s.aY + PAD_H / 2)) / (PAD_H / 2), ang = rel * MAX_BOUNCE_ANGLE; b.vx = -Math.cos(ang) * b.spd; b.vy = Math.sin(ang) * b.spd; }
      if (b.x - BALL_R < 0) { s.aScore++; if (s.aScore >= WIN_SCORE) { s.phase = 'gameover'; s.winner = 'ai'; } else { s.ball = newBall(-1); s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC; } setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner }); return; }
      if (b.x + BALL_R > LW) { s.pScore++; if (s.pScore >= WIN_SCORE) { s.phase = 'gameover'; s.winner = 'player'; } else { s.ball = newBall(1); s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC; } setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner }); return; }
    }

    function draw(s) { ctx.clearRect(0, 0, LW, LH); drawCenterLine(); drawPaddle(PAD_MARGIN, s.pY, '#00e5ff'); drawPaddle(LW - PAD_MARGIN - PAD_W, s.aY, '#ff2d78'); if (s.phase !== 'gameover') drawBall(s.ball, s.tick); if (s.phase === 'countdown') drawCountdown(s.cdown); if (s.phase === 'gameover') drawGameOver(s.winner, isLocal); }
    function tick(ts) { const dt = Math.min(0.05, (ts - lastTRef.current) / 1000); lastTRef.current = ts; const s = stateRef.current; if (!s) { animRef.current = requestAnimationFrame(tick); return; } update(dt, s); draw(s); if (s.tick % 4 === 0) setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner }); animRef.current = requestAnimationFrame(tick); }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [cfg, isLocal, setUi, inputRef, stateRef]);

  const diffLabel = isLocal ? 'LOCAL' : ({ easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }[diff] ?? 'MEDIUM');

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <HomeButton />
      <div style={{ position: 'absolute', top: 22, right: 24, zIndex: 20, fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>PONG — {diffLabel}</div>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Score Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(0,229,255,0.6)', letterSpacing: '0.1em' }}>{isLocal ? 'P1' : 'YOU'}</div>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 48, color: '#00e5ff', textShadow: '0 0 15px rgba(0,229,255,0.6)', lineHeight: 1 }}>{ui.pScore}</div>
          </div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(255,45,120,0.6)', letterSpacing: '0.1em' }}>{isLocal ? 'P2' : 'CPU'}</div>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 48, color: '#ff2d78', textShadow: '0 0 15px rgba(255,45,120,0.6)', lineHeight: 1 }}>{ui.aScore}</div>
          </div>
        </div>

        <div style={{ border: '2px solid rgba(180,0,255,0.38)', borderRadius: 4, boxShadow: '0 0 36px rgba(180,0,255,0.20), 0 0 72px rgba(100,0,255,0.10), inset 0 0 28px rgba(0,0,40,0.88)', overflow: 'hidden' }}><canvas ref={canvasRef} width={LW} height={LH} style={{ display: 'block', width: DW, height: DH }} /></div>
      </div>
      <ControlsLegend controls={isLocal ? [
        ['W / S', 'player-1'],
        ['↑ / ↓', 'player-2'],
      ] : [
        ['W / S / ↑ / ↓', 'move-paddle'],
      ]} />
    </div>
  );
}
