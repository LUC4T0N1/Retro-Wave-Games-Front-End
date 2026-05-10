import { useEffect, useRef, useCallback } from 'react';
import Leaderboard from '../../../components/shared/Leaderboard';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import { useBreakout } from '../../../controllers/breakout/useBreakout';
import { 
  BASE_W, BASE_H, BALL_R, LIVES_START, 
  getBallSpeed, getPaddleW, getPaddleY, buildState 
} from '../../../models/breakout/breakoutModel';

export default function BreakoutGame() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(null);
  const scaleRef = useRef(1);
  const trailRef = useRef([]);
  const lbVisibleRef = useRef(false);

  const { 
    stateRef, keysRef, ui, setUi, lbVisible, setLbVisible, 
    sessionToken, syncUi, startGame, requestSession 
  } = useBreakout();

  useEffect(() => {
    if (ui.status === 'gameover') {
      setLbVisible(true);
      lbVisibleRef.current = true;
    }
  }, [ui.status, setLbVisible]);

  const launch = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'idle') return;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    s.ball.vx = Math.cos(angle); s.ball.vy = Math.sin(angle);
    s.launched = true; s.status = 'playing';
    syncUi();
  }, [syncUi, stateRef]);

  const draw = useCallback((ctx, scale) => {
    const s = stateRef.current;
    const W = BASE_W * scale, H = BASE_H * scale;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(5,0,16,0.82)';
    const fillR = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill(); };
    fillR(0, 0, W, H, 12 * scale);
    ctx.save(); ctx.strokeStyle = '#cc00ff'; ctx.lineWidth = 2 * scale; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14 * scale; ctx.strokeRect(1 * scale, 1 * scale, W - 2 * scale, H - 2 * scale); ctx.restore();
    for (const b of s.bricks) { if (!b.alive) continue; ctx.save(); ctx.fillStyle = b.color; ctx.globalAlpha = 0.4 + 0.6 * (b.hp / b.maxHp); ctx.shadowColor = b.color; ctx.shadowBlur = 8 * scale; fillR(b.x * scale, b.y * scale, b.w * scale, b.h * scale, 3 * scale); if (b.maxHp > 1 && b.hp > 1) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 0; fillR((b.x + 4) * scale, (b.y + 3) * scale, (b.w - 8) * scale, 3 * scale, 1 * scale); } ctx.restore(); }
    for (let i = 0; i < trailRef.current.length; i++) { const tr = trailRef.current[i]; ctx.save(); ctx.globalAlpha = (i / trailRef.current.length) * 0.35; ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 10 * scale; ctx.beginPath(); ctx.arc(tr.x * scale, tr.y * scale, BALL_R * scale * (0.5 + 0.5 * (i / trailRef.current.length)), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 18 * scale; ctx.beginPath(); ctx.arc(s.ball.x * scale, s.ball.y * scale, BALL_R * scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const pd = s.paddle; ctx.save(); ctx.fillStyle = '#ff2d78'; ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 20 * scale; fillR(pd.x * scale, pd.y * scale, pd.w * scale, pd.h * scale, 6 * scale); ctx.restore();
    if (s.status === 'idle') { ctx.save(); ctx.fillStyle = 'rgba(5,0,16,0.55)'; ctx.fillRect(0, BASE_H * scale * 0.38, W, 80 * scale); ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 16 * scale; ctx.font = `bold ${22 * scale}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.fillText(isMobile ? 'TAP TO LAUNCH' : 'CLICK OR SPACE TO LAUNCH', W / 2, BASE_H * scale * 0.48); ctx.restore(); }
    if (s.status === 'levelcomplete') { ctx.save(); ctx.fillStyle = 'rgba(5,0,16,0.70)'; ctx.fillRect(0, BASE_H * scale * 0.36, W, 100 * scale); ctx.fillStyle = '#ffb852'; ctx.shadowColor = '#ffb852'; ctx.shadowBlur = 20 * scale; ctx.font = `bold ${26 * scale}px 'Courier New', monospace`; ctx.textAlign = 'center'; ctx.fillText(`LEVEL ${s.level} CLEAR!`, W / 2, BASE_H * scale * 0.46); ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.font = `${16 * scale}px 'Courier New', monospace`; ctx.fillText('GET READY...', W / 2, BASE_H * scale * 0.53); ctx.restore(); }
  }, [stateRef]);

  const tick = useCallback((ts) => {
    if (lastTRef.current === null) lastTRef.current = ts;
    const dt = Math.min((ts - lastTRef.current) / 1000, 0.05); lastTRef.current = ts;
    const s = stateRef.current, canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'), scale = scaleRef.current;
    if (s.status === 'playing') {
      const spd = getBallSpeed(s.level), pd = s.paddle;
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) pd.x = Math.max(0, pd.x - 420 * dt);
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) pd.x = Math.min(BASE_W - pd.w, pd.x + 420 * dt);
      const steps = 3, sdt = dt / steps; let dead = false, sync = false;
      for (let i = 0; i < steps && !dead; i++) {
        s.ball.x += s.ball.vx * spd * sdt; s.ball.y += s.ball.vy * spd * sdt;
        if (s.ball.x - BALL_R < 0) { s.ball.x = BALL_R; s.ball.vx = Math.abs(s.ball.vx); } if (s.ball.x + BALL_R > BASE_W) { s.ball.x = BASE_W - BALL_R; s.ball.vx = -Math.abs(s.ball.vx); } if (s.ball.y - BALL_R < 0) { s.ball.y = BALL_R; s.ball.vy = Math.abs(s.ball.vy); }
        if (s.ball.vy > 0 && s.ball.y + BALL_R >= pd.y && s.ball.y - BALL_R <= pd.y + pd.h && s.ball.x >= pd.x - BALL_R && s.ball.x <= pd.x + pd.w + BALL_R) { s.ball.y = pd.y - BALL_R; s.ball.vy = -Math.abs(s.ball.vy); const rel = (s.ball.x - (pd.x + pd.w / 2)) / (pd.w / 2); s.ball.vx = rel * 1.2; const len = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy); s.ball.vx /= len; s.ball.vy /= len; }
        for (const b of s.bricks) { if (!b.alive) continue; const ol = s.ball.x + BALL_R - b.x, or = b.x + b.w - (s.ball.x - BALL_R), ot = s.ball.y + BALL_R - b.y, ob = b.y + b.h - (s.ball.y - BALL_R); if (ol > 0 && or > 0 && ot > 0 && ob > 0) { b.hp--; if (b.hp <= 0) { b.alive = false; s.score += 10 * s.level; sync = true; } const minO = Math.min(ol, or, ot, ob); if (minO === ot || minO === ob) s.ball.vy = -s.ball.vy; else s.ball.vx = -s.ball.vx; break; } }
        if (s.ball.y - BALL_R > BASE_H) dead = true;
      }
      if (sync) syncUi();
      trailRef.current.push({ x: s.ball.x, y: s.ball.y }); if (trailRef.current.length > 10) trailRef.current.shift();
      if (dead) { s.lives--; trailRef.current = []; if (s.lives <= 0) { s.status = 'gameover'; syncUi(); } else { const pw = getPaddleW(s.level); s.paddle.x = BASE_W / 2 - pw / 2; s.ball.x = BASE_W / 2; s.ball.y = getPaddleY() - BALL_R - 1; s.ball.vx = 0; s.ball.vy = 0; s.launched = false; s.status = 'idle'; syncUi(); } }
      else if (s.bricks.every(b => !b.alive)) { s.status = 'levelcomplete'; syncUi(); setTimeout(() => { const next = s.level + 1, score = stateRef.current.score, lives = stateRef.current.lives; stateRef.current = buildState(next, score, lives); stateRef.current.status = 'idle'; trailRef.current = []; syncUi(); }, 2200); }
    }
    draw(ctx, scale); rafRef.current = requestAnimationFrame(tick);
  }, [draw, syncUi, stateRef, keysRef]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const maxW = Math.min(window.innerWidth * 0.96, BASE_W), maxH = window.innerHeight * 0.82;
    const scale = Math.min(maxW / BASE_W, maxH / BASE_H, 1);
    scaleRef.current = scale; canvas.width = BASE_W * scale; canvas.height = BASE_H * scale;
  }, []);

  useEffect(() => {
    resize(); window.addEventListener('resize', resize);
    const onDown = (e) => { if (lbVisibleRef.current) return; keysRef.current[e.key] = true; if (e.key === ' ' || e.key === 'Enter') launch(); if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); };
    const onUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [resize, launch, tick, keysRef]);

  const handleMove = (mx) => { if (lbVisibleRef.current) return; const s = stateRef.current; s.paddle.x = Math.max(0, Math.min(BASE_W - s.paddle.w, mx - s.paddle.w / 2)); if (!s.launched) s.ball.x = s.paddle.x + s.paddle.w / 2; };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <HomeButton />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '21px 24px 0', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}><span style={{ color: '#ff2d78', fontFamily: "'Courier New', monospace", fontSize: 14, letterSpacing: 1, textShadow: '0 0 8px #ff2d78' }}>BEST {ui.best}</span></div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '8px 0 6px', marginTop: isMobile ? 45 : 0, position: 'relative', zIndex: 10 }}><span style={{ color: '#00ffcc', fontFamily: "'Courier New', monospace", fontSize: 15, textShadow: '0 0 8px #00ffcc' }}>SCORE {ui.score}</span><span style={{ color: '#cc00ff', fontFamily: "'Courier New', monospace", fontSize: 15, textShadow: '0 0 8px #cc00ff' }}>LV {ui.level}</span><span style={{ color: '#ff2d78', fontFamily: "'Courier New', monospace", fontSize: 18, textShadow: '0 0 10px #ff2d78', letterSpacing: 3 }}>{'♥'.repeat(ui.lives)}</span></div>
      <div style={{ position: 'relative', zIndex: 10, cursor: 'none' }}><canvas ref={canvasRef} onClick={() => !lbVisibleRef.current && launch()} onMouseMove={(e) => handleMove((e.clientX - canvasRef.current.getBoundingClientRect().left) / scaleRef.current)} onTouchMove={(e) => { e.preventDefault(); handleMove((e.touches[0].clientX - canvasRef.current.getBoundingClientRect().left) / scaleRef.current); }} onTouchStart={(e) => { handleMove((e.touches[0].clientX - canvasRef.current.getBoundingClientRect().left) / scaleRef.current); launch(); }} style={{ display: 'block', borderRadius: 12, touchAction: 'none' }} /></div>
      <Leaderboard apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/breakout`} score={ui.score} sessionToken={sessionToken} onPlayAgain={startGame} visible={lbVisible} />
    </div>
  );
}
