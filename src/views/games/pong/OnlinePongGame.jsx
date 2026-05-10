import { useEffect, useRef, useState } from 'react';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';

// Visual constants (must match server)
const LW = 800, LH = 480;
const BALL_R = 8;
const PAD_W = 14, PAD_H = 92;
const PAD_MARGIN = 28;
const INIT_SPEED = 6.5;
const COUNTDOWN_SEC = 3;
const PLAYER_SPD = 7.5;

const LEFT_PAD_X  = PAD_MARGIN;
const RIGHT_PAD_X = LW - PAD_MARGIN - PAD_W;

function initState() {
  return {
    ball:   { x: LW / 2, y: LH / 2, vx: 0, vy: 0, spd: INIT_SPEED, hits: 0 },
    myY:    (LH - PAD_H) / 2,   // own paddle (local, responsive)
    pScore: 0, aScore: 0,
    phase:  'countdown', cdown: COUNTDOWN_SEC,
    winner: null, tick: 0,
  };
}

// Sub-stepped extrapolation so wall bounces are correct between server ticks
function stepBall(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y - BALL_R < 0)  { b.y = BALL_R;      b.vy =  Math.abs(b.vy); }
  if (b.y + BALL_R > LH) { b.y = LH - BALL_R; b.vy = -Math.abs(b.vy); }
}

function extrapolateBall(rb, ageSec) {
  const b = { ...rb };
  const steps = Math.max(1, Math.ceil(ageSec * 120));
  const dt = (ageSec * 60) / steps;
  for (let i = 0; i < steps; i++) stepBall(b, dt);
  return b;
}

function smoothPad(current, target, dt) {
  const diff = target - current;
  if (Math.abs(diff) > 150) return target;
  return current + diff * (1 - Math.exp(-dt * 20));
}

// ─── Component ────────────────────────────────────────────────────────────────
// The server runs all physics. This component is a pure renderer:
//   • own paddle  → controlled locally (no lag), emitted to server every frame
//   • opp paddle  → smoothed from server state
//   • ball        → extrapolated from last server tick for smooth display
function OnlinePongGame({ socket, room, side, opponentName }) {
  const isHost = side === 'left';

  const canvasRef       = useRef(null);
  const stateRef        = useRef(null);
  const animRef         = useRef(null);
  const lastTRef        = useRef(0);
  const inputRef        = useRef({ up: false, down: false, touchY: null });
  const myReadyRef        = useRef(false);
  const oppLeftRef        = useRef(false);
  const remoteBallRef     = useRef(null);              // latest ball snapshot from server
  const remoteOppPadRef   = useRef(null);              // latest raw opponent paddle from server
  const oppPadVisual      = useRef((LH - PAD_H) / 2); // smoothed opponent paddle for display
  const lastPaddleEmitRef = useRef(0);                 // throttle pong-paddle to 30 Hz

  const scale = isMobile
    ? Math.min((window.innerWidth * 0.98) / LW, (window.innerHeight * 0.78) / LH)
    : 1;
  const DW = Math.round(LW * scale);
  const DH = Math.round(LH * scale);

  const [ui, setUi] = useState({ pScore: 0, aScore: 0, phase: 'countdown', winner: null, oppLeft: false });

  // Cleanup on unmount
  useEffect(() => {
    return () => { socket.emit('pong-leave', { room }); };
  }, [socket, room]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key))   { e.preventDefault(); inputRef.current.up   = true; }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); inputRef.current.down = true; }
      if ([' ', 'Enter'].includes(e.key) && stateRef.current?.phase === 'gameover' && !myReadyRef.current) {
        myReadyRef.current = true;
        socket.emit('pong-restart-ready', { room });
      }
    };
    const onUp = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key))   inputRef.current.up   = false;
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.down = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [socket, room]);

  // ── Touch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getY = (e) => ((e.touches[0]?.clientY ?? 0) - canvas.getBoundingClientRect().top) / scale;
    const onStart = (e) => {
      e.preventDefault();
      if (stateRef.current?.phase === 'gameover' && !myReadyRef.current) {
        myReadyRef.current = true;
        socket.emit('pong-restart-ready', { room });
      }
      inputRef.current.touchY = getY(e);
    };
    const onMove = (e) => { e.preventDefault(); inputRef.current.touchY = getY(e); };
    const onEnd  = ()  => { inputRef.current.touchY = null; };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onEnd);
    };
  }, [scale, socket, room]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    // Server broadcasts full game state every ~16 ms
    const onState = ({ bx, by, bvx, bvy, bspd, bhits, pY, aY, pScore, aScore, phase, cdown, winner }) => {
      const s = stateRef.current;
      if (!s) return;
      remoteBallRef.current   = { x: bx, y: by, vx: bvx, vy: bvy, spd: bspd, hits: bhits, ts: performance.now() };
      remoteOppPadRef.current = isHost ? aY : pY;   // opponent's paddle from server
      s.pScore = pScore;
      s.aScore = aScore;
      s.phase  = phase;
      s.cdown  = cdown;
      s.winner = winner;
    };

    // Server resets game when both players are ready
    const onRestart = () => {
      const s = stateRef.current;
      if (!s) return;
      remoteBallRef.current   = null;
      remoteOppPadRef.current = null;
      oppPadVisual.current    = (LH - PAD_H) / 2;
      s.myY   = (LH - PAD_H) / 2;
      s.ball  = { x: LW / 2, y: LH / 2, vx: 0, vy: 0, spd: INIT_SPEED, hits: 0 };
      s.pScore = 0; s.aScore = 0;
      s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC; s.winner = null;
      myReadyRef.current = false;
      setUi({ pScore: 0, aScore: 0, phase: 'countdown', winner: null, oppLeft: false });
    };

    const onOppLeft = () => {
      oppLeftRef.current = true;
      setUi(u => ({ ...u, oppLeft: true }));
    };

    socket.on('pong-state',         onState);
    socket.on('pong-restart',       onRestart);
    socket.on('pong-opponent-left', onOppLeft);

    return () => {
      socket.off('pong-state',         onState);
      socket.off('pong-restart',       onRestart);
      socket.off('pong-opponent-left', onOppLeft);
    };
  }, [socket, isHost]);

  // ── Game loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initState();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Draw helpers ──────────────────────────────────────────────────────────
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function drawCenterLine() {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,0,255,0.28)'; ctx.shadowColor = '#c200ff'; ctx.shadowBlur = 10;
      ctx.lineWidth = 2; ctx.setLineDash([14, 14]);
      ctx.beginPath(); ctx.moveTo(LW / 2, 0); ctx.lineTo(LW / 2, LH); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    function drawPaddle(x, y, color) {
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 26;
      rr(x, y, PAD_W, PAD_H, 4); ctx.fillStyle = color; ctx.fill();
      ctx.globalAlpha = 0.30;
      rr(x + 2, y + 4, PAD_W - 4, PAD_H - 8, 3); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }

    function drawBall(b, tick) {
      ctx.save();
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.07 * (4 - i); ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(b.x - b.vx * i * 0.9, b.y - b.vy * i * 0.9, BALL_R * (1 - i * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 16 + 6 * Math.sin(tick * 0.09);
      const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, BALL_R);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ffe066'); g.addColorStop(1, 'rgba(255,136,0,0.6)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawCountdown(cdown) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.35 + (cdown % 1) * 0.65);
      ctx.font = "bold 88px 'VT323', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 28; ctx.fillStyle = '#00e5ff';
      ctx.fillText(Math.ceil(cdown), LW / 2, LH / 2 + 50); ctx.restore();
    }

    function drawGameOver(winner) {
      ctx.save();
      ctx.globalAlpha = 0.62; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH); ctx.globalAlpha = 1;
      const iWon = (isHost && winner === 'left') || (!isHost && winner === 'right');
      const col  = iWon ? '#00ffcc' : '#ff2d78';
      ctx.shadowColor = col; ctx.shadowBlur = 50;
      ctx.font = "bold 68px 'Orbitron', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
      ctx.fillText(iWon ? 'YOU WIN!' : `${opponentName || 'OPP'} WINS`, LW / 2, LH / 2 - 30);
      ctx.shadowBlur = 0; ctx.font = "13px 'Orbitron', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,0.50)';
      ctx.fillText(isMobile ? 'TAP TO PLAY AGAIN' : 'PRESS SPACE TO PLAY AGAIN', LW / 2, LH / 2 + 28);
      ctx.restore();
    }

    function drawOppLeft() {
      ctx.save();
      ctx.globalAlpha = 0.72; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH); ctx.globalAlpha = 1;
      ctx.font = "bold 48px 'Orbitron', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 40; ctx.fillStyle = '#ff8c00';
      ctx.fillText('OPPONENT LEFT', LW / 2, LH / 2 - 24);
      ctx.shadowBlur = 0; ctx.font = "13px 'Orbitron', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('RETURN TO MENU', LW / 2, LH / 2 + 28); ctx.restore();
    }

    function movePaddle(s, dt) {
      const inp  = inputRef.current;
      const dt60 = dt * 60;
      if (inp.touchY !== null) {
        s.myY = Math.max(0, Math.min(LH - PAD_H, inp.touchY - PAD_H / 2));
      } else {
        if (inp.up)   s.myY = Math.max(0,          s.myY - PLAYER_SPD * dt60);
        if (inp.down) s.myY = Math.min(LH - PAD_H, s.myY + PLAYER_SPD * dt60);
      }
      const now = performance.now();
      if (now - lastPaddleEmitRef.current >= 33) {
        socket.emit('pong-paddle', { room, y: s.myY });
        lastPaddleEmitRef.current = now;
      }
    }

    function update(dt, s) {
      s.tick++;

      // Own paddle: move locally for zero-lag response, then send to server
      movePaddle(s, dt);

      // Opponent paddle: smooth the server value to hide packet jitter
      if (remoteOppPadRef.current !== null) {
        oppPadVisual.current = smoothPad(oppPadVisual.current, remoteOppPadRef.current, dt);
      }

      // Ball: take the latest server snapshot and dead-reckon to "now"
      const rb = remoteBallRef.current;
      if (rb) {
        const ageSec = Math.min((performance.now() - rb.ts) / 1000, 0.05);
        const pred   = ageSec > 0.001 ? extrapolateBall(rb, ageSec) : rb;
        s.ball.x    = pred.x;
        s.ball.y    = pred.y;
        s.ball.vx   = rb.vx;
        s.ball.vy   = rb.vy;
        s.ball.spd  = rb.spd;
        s.ball.hits = rb.hits;
      }
    }

    function draw(s) {
      ctx.clearRect(0, 0, LW, LH);
      drawCenterLine();

      // Own paddle (left or right) is rendered at local position — no network lag.
      // Opponent paddle is smoothed from server state.
      const leftY  = isHost ? s.myY          : oppPadVisual.current;
      const rightY = isHost ? oppPadVisual.current : s.myY;
      drawPaddle(LEFT_PAD_X,  leftY,  '#00e5ff');
      drawPaddle(RIGHT_PAD_X, rightY, '#ff2d78');

      if (s.phase !== 'gameover') drawBall(s.ball, s.tick);
      if (s.phase === 'countdown') drawCountdown(s.cdown);
      if (s.phase === 'gameover' && !oppLeftRef.current) drawGameOver(s.winner);
      if (oppLeftRef.current) drawOppLeft();
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      update(dt, s);
      draw(s);
      if (s.tick % 4 === 0) {
        setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner, oppLeft: oppLeftRef.current });
      }
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current  = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isHost, socket, room, opponentName]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      <div style={{
        position: 'absolute', top: 22, right: 24, zIndex: 20,
        fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
      }}>
        PONG — ONLINE
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Score Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(0,229,255,0.6)', letterSpacing: '0.1em' }}>{isHost ? 'YOU' : (opponentName || 'OPP')}</div>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 48, color: '#00e5ff', textShadow: '0 0 15px rgba(0,229,255,0.6)', lineHeight: 1 }}>{ui.pScore}</div>
          </div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(255,45,120,0.6)', letterSpacing: '0.1em' }}>{isHost ? (opponentName || 'OPP') : 'YOU'}</div>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 48, color: '#ff2d78', textShadow: '0 0 15px rgba(255,45,120,0.6)', lineHeight: 1 }}>{ui.aScore}</div>
          </div>
        </div>

        <div style={{
          border: '2px solid rgba(180,0,255,0.38)', borderRadius: 4,
          boxShadow: '0 0 36px rgba(180,0,255,0.20), 0 0 72px rgba(100,0,255,0.10), inset 0 0 28px rgba(0,0,40,0.88)',
          overflow: 'hidden',
        }}>
          <canvas ref={canvasRef} width={LW} height={LH} style={{ display: 'block', width: DW, height: DH }} />
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 14,
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          {isMobile ? 'DRAG TO MOVE PADDLE' : 'W / ↑ — UP   •   S / ↓ — DOWN'}
        </div>
      </div>
    </div>
  );
}

export default OnlinePongGame;
