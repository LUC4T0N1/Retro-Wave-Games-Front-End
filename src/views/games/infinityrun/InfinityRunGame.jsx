import { useEffect, useRef } from 'react';
import Leaderboard from '../../../components/shared/Leaderboard';
import ControlsLegend from '../../../components/shared/ControlsLegend';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import { useInfinityRun } from '../../../controllers/infinityrun/useInfinityRun';
import { 
  LW, LH, GROUND_Y, GRAVITY, JUMP_VY, DJUMP_VY, 
  MONKEY_W, MONKEY_H, MONKEY_DW, MONKEY_DH, MONKEY_X, 
  INIT_SPEED, MAX_SPEED, SPEED_RAMP, OBS, OBS_KEYS 
} from '../../../models/infinityrun/infinityRunModel';

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function InfinityRunGame() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTRef = useRef(0);
  const { 
    stateRef, inputRef, ui, setUi, lbVisible, setLbVisible, 
    sessionToken, restart 
  } = useInfinityRun();

  const scale = isMobile ? Math.min((window.innerWidth * 0.96) / LW, (window.innerHeight * 0.58) / LH) : 1;
  const DW = Math.round(LW * scale);
  const DH = Math.round(LH * scale);

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    if (ui.status === 'dead') {
      setLbVisible(true);
    }
  }, [ui.status, setLbVisible]);

  useEffect(() => {
    const onDown = (e) => {
      if (stateRef.current?.status === 'dead') return;
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); if (!e.repeat) inputRef.current.jumpQ++; }
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.duckHeld = true;
    };
    const onUp = (e) => {
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.duckHeld = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [stateRef, inputRef]);

  useEffect(() => {
    const onStart = (e) => {
      if (stateRef.current?.status === 'dead') return;
      const y = e.touches[0]?.clientY ?? 0;
      if (y < window.innerHeight * 0.65) inputRef.current.jumpQ++;
      else inputRef.current.duckHeld = true;
    };
    const onEnd = () => { inputRef.current.duckHeld = false; };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, [stateRef, inputRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawBg(tick) {
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, '#030010'); sky.addColorStop(0.35, '#0e0035');
      sky.addColorStop(0.65, '#55006a'); sky.addColorStop(0.85, '#cc0062'); sky.addColorStop(1, '#e6006c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, LW, GROUND_Y);

      const seeds = [17,53,89,131,173,211,257,313,379,431,499,563,631,709,787,863,941,1019,1097,1181,1259,1327];
      seeds.forEach((s, i) => {
        const x = (s * 37 + i * 200) % LW, y = (s * 13 + i * 50) % (GROUND_Y * 0.62);
        const r = s % 3 === 0 ? 1.5 : 0.8;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(tick * 0.017 + s * 0.1));
        ctx.save(); ctx.globalAlpha = tw * 0.85; ctx.fillStyle = s % 5 === 0 ? '#e0c8ff' : '#fff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      const sx = LW * 0.5, sy = GROUND_Y * 0.68, sr = 38;
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip();
      const sg = ctx.createLinearGradient(sx, sy - sr, sx, sy + sr);
      sg.addColorStop(0, '#ffee00'); sg.addColorStop(0.25, '#ff8800'); sg.addColorStop(0.55, '#ff2222'); sg.addColorStop(1, '#aa0044');
      ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      for (let i = 0; i < 8; i++) {
        const ly = sy + (i / 8) * sr * 0.9; ctx.fillStyle = `rgba(4,0,10,${0.32 + i * 0.055})`; ctx.fillRect(sx - sr, ly, sr * 2, 5 + i * 0.5);
      }
      ctx.restore();
    }

    function drawGround(dist) {
      const gg = ctx.createLinearGradient(0, GROUND_Y, 0, LH);
      gg.addColorStop(0, '#15003e'); gg.addColorStop(1, '#060018');
      ctx.fillStyle = gg; ctx.fillRect(0, GROUND_Y, LW, LH - GROUND_Y);
      const spacing = 72, vp = LW / 2, offset = dist % spacing;
      for (let i = -1; i < LW / spacing + 3; i++) {
        const gx = i * spacing - offset; if (gx < -spacing || gx > LW + spacing) continue;
        const hx = vp + (gx - vp) * 0.06;
        ctx.strokeStyle = `rgba(0,50,200,${0.10 + (Math.abs(gx - vp) / (LW / 2)) * 0.07})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(hx, GROUND_Y); ctx.lineTo(gx, LH); ctx.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const t = (i + 1) / 7, y = GROUND_Y + (LH - GROUND_Y) * t * t;
        ctx.strokeStyle = `rgba(0,75,210,${0.10 + t * 0.55})`; ctx.lineWidth = 0.5 + t * 0.8;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LW, y); ctx.stroke();
      }
      ctx.strokeStyle = '#0055ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(LW, GROUND_Y); ctx.stroke();
    }

    function drawMonkey(m) {
      const { y, ducking, animTick, onGround } = m;
      const O = '#ff8c00', LO = '#ffb84d', DO = '#cc5000', G = '#ff6600';
      ctx.save();
      if (ducking) {
        const bx = MONKEY_X - MONKEY_DW / 2, by = y;
        ctx.strokeStyle = DO; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx + 6, by + 4); ctx.quadraticCurveTo(bx - 14, by - 8, bx - 5, by - 20); ctx.stroke();
        ctx.shadowColor = G; ctx.shadowBlur = 14; ctx.fillStyle = O;
        rrPath(ctx, bx + 5, by + 2, MONKEY_DW - 22, MONKEY_DH - 4, 6); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + MONKEY_DW - 13, by + MONKEY_DH / 2, 14, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = LO;
        ctx.beginPath(); ctx.ellipse(bx + MONKEY_DW - 10, by + MONKEY_DH / 2 + 2, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + MONKEY_DW - 6, by + MONKEY_DH / 2 - 3, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(bx + MONKEY_DW - 5, by + MONKEY_DH / 2 - 3, 1.8, 0, Math.PI * 2); ctx.fill();
      } else {
        const bx = MONKEY_X - MONKEY_W / 2, by = y, rs = Math.sin(animTick * 0.24);
        // Tail
        ctx.strokeStyle = DO; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        const tw = onGround ? Math.sin(animTick * 0.22) * 7 : 0;
        ctx.beginPath(); ctx.moveTo(bx + 2, by + MONKEY_H * 0.55); ctx.quadraticCurveTo(bx - 17, by + MONKEY_H * 0.35 + tw, bx - 8, by + 5); ctx.stroke();
        // Legs
        ctx.shadowColor = G; ctx.shadowBlur = 8; ctx.fillStyle = O;
        const ll = onGround ? Math.round(rs * 9) : 0;
        ctx.fillRect(bx + 4, by + MONKEY_H - 20 + (ll > 0 ? 0 : -ll), 11, 20 + (ll > 0 ? ll : 0));
        ctx.fillRect(bx + MONKEY_W - 15, by + MONKEY_H - 20 + (ll > 0 ? -ll : 0), 11, 20 + (ll > 0 ? 0 : ll));
        // Body
        ctx.shadowColor = G; ctx.shadowBlur = 14; ctx.fillStyle = O;
        rrPath(ctx, bx + 2, by + MONKEY_H * 0.35, MONKEY_W - 4, MONKEY_H * 0.58, 7); ctx.fill();
        // Arms (Animated)
        const as = onGround ? rs * 10 : -8;
        ctx.save();
        ctx.fillStyle = O; ctx.shadowBlur = 0;
        // Left Arm
        ctx.translate(bx + 6, by + MONKEY_H * 0.5);
        ctx.rotate(as * Math.PI / 180);
        rrPath(ctx, -5, 0, 10, 18, 5); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.restore();
        ctx.save();
        ctx.fillStyle = O;
        // Right Arm
        ctx.translate(bx + MONKEY_W - 6, by + MONKEY_H * 0.5);
        ctx.rotate(-as * Math.PI / 180);
        rrPath(ctx, -5, 0, 10, 18, 5); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.restore();
        // Head
        ctx.shadowColor = G; ctx.shadowBlur = 14; ctx.fillStyle = O;
        ctx.beginPath(); ctx.arc(bx + MONKEY_W / 2, by + 14, 15, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = LO;
        ctx.beginPath(); ctx.ellipse(bx + MONKEY_W / 2, by + 18, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; 
        ctx.beginPath(); ctx.arc(bx + MONKEY_W / 2 - 5, by + 12, 4, 0, Math.PI * 2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(bx + MONKEY_W / 2 + 5, by + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; 
        ctx.beginPath(); ctx.arc(bx + MONKEY_W / 2 - 4, by + 12, 2, 0, Math.PI * 2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(bx + MONKEY_W / 2 + 6, by + 12, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function drawObstacle(obs, tick) {
      const { x, type, w, h, yOff } = obs;
      const top = GROUND_Y - yOff - h;
      ctx.save();
      if (type.startsWith('cactus')) {
        function cactSeg(rx, ry, rw, rh, r) {
          const g = ctx.createLinearGradient(rx, ry, rx + rw, ry);
          g.addColorStop(0, '#004b00'); g.addColorStop(0.5, '#006400'); g.addColorStop(1, '#003300');
          ctx.fillStyle = g; ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 12;
          rrPath(ctx, rx, ry, rw, rh, r); ctx.fill();
          // Ribbon detail
          ctx.globalAlpha = 0.2; ctx.fillStyle = '#00ff41';
          ctx.fillRect(rx + rw * 0.4, ry + 2, 2, rh - 4);
          ctx.globalAlpha = 1;
        }
        function spines(sx, sy, dir) {
          ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 1; ctx.shadowBlur = 5;
          for (let i = 0; i < 3; i++) {
            const oy = (i - 1) * 5;
            ctx.beginPath(); ctx.moveTo(sx, sy + oy); ctx.lineTo(sx + dir * 7, sy + oy - 2); ctx.stroke();
          }
        }
        const mid = x + w / 2;
        if (type === 'cactus_tall') {
          cactSeg(mid - 30, top + h * 0.15, 22, 10, 4); cactSeg(mid - 30, top + h * 0.15, 10, h * 0.25, 4);
          cactSeg(mid + 8, top + h * 0.35, 22, 10, 4); cactSeg(mid + 20, top + h * 0.2, 10, h * 0.2, 4);
          cactSeg(mid - 9, top, 18, h, 8);
          spines(mid - 30, top + h * 0.15, -1); spines(mid + 30, top + h * 0.35, 1);
        } else if (type === 'cactus_short') {
          cactSeg(mid - 24, top + h * 0.3, 16, 10, 4); cactSeg(mid - 16, top + h * 0.1, 9, h * 0.25, 4);
          cactSeg(mid + 8, top + h * 0.45, 16, 10, 4); cactSeg(mid + 7, top + h * 0.25, 9, h * 0.25, 4);
          cactSeg(mid - 8, top, 16, h, 7);
          spines(mid - 24, top + h * 0.3, -1); spines(mid + 24, top + h * 0.45, 1);
        } else {
          // cactus_pair or generic
          cactSeg(x + 4, top + 15, 15, h - 15, 6);
          cactSeg(x + w - 19, top + 5, 15, h - 5, 6);
          spines(x + 4, top + h * 0.5, -1); spines(x + w - 4, top + h * 0.3, 1);
        }
      } else {
        const cx = x + w / 2, cy = top + h / 2;
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#005588';
        ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - 5, h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + w / 2 - 12, cy - 4, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function update(dt, s) {
      if (s.status !== 'playing') return;
      const m = s.monkey, inp = inputRef.current, dt_60 = dt * 60;
      m.ducking = inp.duckHeld && m.onGround;
      if (inp.jumpQ > 0) {
        inp.jumpQ = 0;
        if (m.jumpsLeft > 0) { m.vy = m.onGround ? JUMP_VY : DJUMP_VY; m.onGround = false; m.ducking = false; m.jumpsLeft--; }
      }
      m.vy += GRAVITY * dt_60; m.y += m.vy * dt_60;
      const floor = GROUND_Y - (m.ducking ? MONKEY_DH : MONKEY_H);
      if (m.y >= floor) { m.y = floor; m.vy = 0; m.onGround = true; m.jumpsLeft = 2; }
      if (m.onGround && !m.ducking) m.animTick += dt_60;
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_RAMP * dt_60);
      const px = s.speed * dt * 60; s.dist += px; s.score += s.speed * 0.1 * dt_60;
      s.obstacles.forEach(o => { o.x -= px; }); s.obstacles = s.obstacles.filter(o => o.x + o.w > -30);
      if (s.dist >= s.nextObs) {
        const pool = s.speed > 9 ? OBS_KEYS : OBS_KEYS.filter(k => k !== 'bird');
        const key = pool[Math.floor(Math.random() * pool.length)];
        s.obstacles.push({ x: LW + 20, type: key, ...OBS[key] });
        const speedNorm = Math.min(1, (s.speed - INIT_SPEED) / (MAX_SPEED - INIT_SPEED));
        s.nextObs = s.dist + (380 + speedNorm * 100) + Math.random() * (820 - speedNorm * 180 - (380 + speedNorm * 100));
      }
      const pad = 7;
      const mH = m.ducking ? MONKEY_DH : MONKEY_H, mHalf = (m.ducking ? MONKEY_DW : MONKEY_W) / 2;
      const mL = MONKEY_X - mHalf + pad, mR = MONKEY_X + mHalf - pad, mT = m.y + pad, mB = m.y + mH - pad;
      for (const o of s.obstacles) {
        if (mL < o.x + o.w - pad && mR > o.x + pad && mT < GROUND_Y - o.yOff - pad && mB > GROUND_Y - o.yOff - o.h + pad) {
          s.status = 'dead'; setUi({ score: Math.floor(s.score), speed: s.speed, status: 'dead' }); return;
        }
      }
      s.tick++;
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      update(dt, s);
      ctx.clearRect(0, 0, LW, LH);
      drawBg(s.tick); drawGround(s.dist);
      s.obstacles.forEach(o => drawObstacle(o, s.tick));
      drawMonkey(s.monkey);
      if (s.status === 'dead') { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff0044'; ctx.fillRect(0, 0, LW, LH); ctx.restore(); }
      if (s.status === 'playing' && s.tick % 6 === 0) setUi({ score: Math.floor(s.score), speed: s.speed, status: 'playing' });
      animRef.current = requestAnimationFrame(tick);
    }
    lastTRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [setUi]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <HomeButton />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: DW, fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13, color: '#fff', letterSpacing: '0.08em', padding: '0 4px', boxSizing: 'border-box' }}>
          <div>
            <span style={{ color: '#ffe066', textShadow: '0 0 10px #ffcc00' }}>SCORE </span>
            <span>{ui.score.toLocaleString()}</span>
          </div>
          <div style={{ color: '#ff8c00', textShadow: '0 0 10px #ff6600' }}>
            {Math.round(ui.speed * 10) / 10}x SPEED
          </div>
        </div>

        {/* Canvas */}
        <div style={{ border: '2px solid rgba(0,180,255,0.4)', borderRadius: 4, boxShadow: '0 0 32px rgba(0,100,255,0.28), inset 0 0 24px rgba(0,0,40,0.85)', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width={LW} height={LH} style={{ display: 'block', width: DW, height: DH }} />
        </div>

      </div>

      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/infinity-run`}
        score={ui.score}
        sessionToken={sessionToken}
        onPlayAgain={restart}
        visible={lbVisible}
      />
      <ControlsLegend controls={[
        ['SPACE / ↑', 'jump'],
        ['↓ / S', 'duck'],
      ]} />
    </div>
  );
}
