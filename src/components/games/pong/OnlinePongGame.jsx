import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

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
const MAX_BOUNCE_ANGLE = Math.PI / 3;

// Right edge of left paddle / left edge of right paddle
const P_RIGHT = PAD_MARGIN + PAD_W;        // 42
const A_LEFT  = LW - PAD_MARGIN - PAD_W;   // 758

function newBall(dir) {
  const angle = Math.PI / 9 + Math.random() * (Math.PI / 6);
  const ys = Math.random() < 0.5 ? 1 : -1;
  return {
    x: LW / 2, y: LH / 2,
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
    pScore: 0, aScore: 0,
    phase: 'countdown', cdown: COUNTDOWN_SEC,
    winner: null, tick: 0,
  };
}

function applyBounce(b, padY, dir /* +1 left paddle, -1 right paddle */) {
  b.hits++;
  b.spd = Math.min(MAX_SPEED, INIT_SPEED + b.hits * SPD_PER_HIT);
  const rel = Math.max(-1, Math.min(1, (b.y - (padY + PAD_H / 2)) / (PAD_H / 2)));
  b.vx = dir * Math.cos(rel * MAX_BOUNCE_ANGLE) * b.spd;
  b.vy =       Math.sin(rel * MAX_BOUNCE_ANGLE) * b.spd;
}

function OnlinePongGame({ socket, room, side, opponentName }) {
  const isHost = side === 'left';

  const canvasRef         = useRef(null);
  const stateRef          = useRef(null);
  const animRef           = useRef(null);
  const lastTRef          = useRef(0);
  const inputRef          = useRef({ up: false, down: false, touchY: null });
  const myReadyRef        = useRef(false);
  const oppReadyRef       = useRef(false);
  const oppLeftRef        = useRef(false);

  // Network sync refs
  const remoteBallRef     = useRef(null);          // Latest received authoritative ball
  const remoteOppPadRef   = useRef(null);          // Latest received opponent Y
  const oppPadVisualRef   = useRef((LH - PAD_H) / 2); // Smoothed visual opponent paddle

  const scale = isMobile
    ? Math.min((window.innerWidth * 0.98) / LW, (window.innerHeight * 0.78) / LH)
    : 1;
  const DW = Math.round(LW * scale);
  const DH = Math.round(LH * scale);

  const [ui, setUi] = useState({
    pScore: 0, aScore: 0, phase: 'countdown', winner: null, oppLeft: false,
  });

  const doRestart = useCallback(() => {
    myReadyRef.current      = false;
    oppReadyRef.current     = false;
    remoteBallRef.current   = null;
    guestHitSentRef.current = false;
    oppPadVisualRef.current = (LH - PAD_H) / 2;
    stateRef.current = initState();
    setUi({ pScore: 0, aScore: 0, phase: 'countdown', winner: null, oppLeft: false });
  }, []);

  useEffect(() => {
    return () => { socket.emit('pong-leave', { room }); };
  }, [socket, room]);

  useEffect(() => {
    const onDown = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key))   { e.preventDefault(); inputRef.current.up   = true; }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); inputRef.current.down = true; }
      if ([' ', 'Enter'].includes(e.key) && stateRef.current?.phase === 'gameover') {
        myReadyRef.current = true;
        socket.emit('pong-restart-ready', { room });
        if (oppReadyRef.current) doRestart();
      }
    };
    const onUp = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key))   inputRef.current.up   = false;
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.down = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [socket, room, doRestart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getY = (e) => ((e.touches[0]?.clientY ?? 0) - canvas.getBoundingClientRect().top) / scale;
    const onStart = (e) => {
      e.preventDefault();
      if (stateRef.current?.phase === 'gameover') {
        myReadyRef.current = true;
        socket.emit('pong-restart-ready', { room });
        if (oppReadyRef.current) doRestart();
      }
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
  }, [scale, socket, room, doRestart]);

  useEffect(() => {
    const onPaddle = ({ y }) => { remoteOppPadRef.current = y; };

    // Receive ball state from the current authority
    const onBall = ({ x, y, vx, vy, spd, hits }) => {
      const s = stateRef.current;
      if (!s) return;

      // If I am current authority (ball coming to me), I ignore remote ball
      // EXCEPT during countdown where Host is always authority
      const isAuthority = s.phase === 'playing' && ((isHost && vx <= 0) || (!isHost && vx > 0));
      if (isAuthority) return;

      remoteBallRef.current = { x, y, vx, vy, spd: spd ?? INIT_SPEED, hits: hits ?? 0, ts: performance.now() };
      
      // Force sync during countdown or if ball was just launched
      if (s.phase === 'countdown' || !s.ball.vx) {
        s.ball.x = x; s.ball.y = y; s.ball.vx = vx; s.ball.vy = vy; s.ball.spd = spd; s.ball.hits = hits;
      }
    };

    const onPoint = ({ leftScore, rightScore }) => {
      const s = stateRef.current;
      if (!s) return;
      s.pScore = leftScore; s.aScore = rightScore;
      if      (leftScore  >= WIN_SCORE) { s.phase = 'gameover'; s.winner = 'player'; }
      else if (rightScore >= WIN_SCORE) { s.phase = 'gameover'; s.winner = 'ai'; }
      else {
        // Prepare for next round — Host will decide initial direction
        s.phase = 'countdown'; s.cdown = COUNTDOWN_SEC;
        s.ball = newBall(0); // Stop ball locally until Host syncs it
        remoteBallRef.current = null;
      }
      setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner, oppLeft: false });
    };
    const onRestartReady = () => {
      oppReadyRef.current = true;
      if (myReadyRef.current) doRestart();
    };
    const onOppLeft = () => { oppLeftRef.current = true; setUi(u => ({ ...u, oppLeft: true })); };

    socket.on('pong-paddle', onPaddle);
    socket.on('pong-restart-ready', onRestartReady);
    socket.on('pong-opponent-left', onOppLeft);
    socket.on('pong-ball',  onBall);
    socket.on('pong-point', onPoint);

    return () => {
      socket.off('pong-paddle', onPaddle);
      socket.off('pong-ball',  onBall);
      socket.off('pong-point', onPoint);
      socket.off('pong-restart-ready', onRestartReady);
      socket.off('pong-opponent-left', onOppLeft);
    };
  }, [socket, isHost, doRestart, room]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initState();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function drawBg(tick) {
      const g = ctx.createLinearGradient(0, 0, 0, LH);
      g.addColorStop(0, '#020010'); g.addColorStop(0.35, '#0c002e');
      g.addColorStop(0.65, '#320050'); g.addColorStop(1, '#100022');
      ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
      const S = [11,37,71,113,157,199,241,293,337,401,457,509,563,617,673,743,811,877,941,1009];
      S.forEach((sv, i) => {
        const sx = (sv * 53 + i * 180) % LW, sy = (sv * 19 + i * 42) % (LH * 0.72);
        const sr = sv % 3 === 0 ? 1.4 : 0.75;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.55 * Math.abs(Math.sin(tick * 0.012 + sv * 0.3));
        ctx.fillStyle = sv % 7 === 0 ? '#e0c8ff' : '#fff';
        if (sv % 7 === 0) { ctx.shadowColor = '#e0c8ff'; ctx.shadowBlur = 5; }
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      const cx = LW / 2, cy = LH * 0.58, cr = 44;
      const og = ctx.createRadialGradient(cx, cy, cr * 0.4, cx, cy, cr * 2.6);
      og.addColorStop(0, 'rgba(255,60,0,0.40)'); og.addColorStop(0.38, 'rgba(180,0,80,0.16)'); og.addColorStop(1, 'transparent');
      ctx.fillStyle = og; ctx.fillRect(cx - cr * 2.8, cy - cr * 2.8, cr * 5.6, cr * 5.6);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.clip();
      const sg = ctx.createLinearGradient(cx, cy - cr, cx, cy + cr);
      sg.addColorStop(0, '#ffee00'); sg.addColorStop(0.22, '#ff8800');
      sg.addColorStop(0.55, '#ff1122'); sg.addColorStop(1, '#990044');
      ctx.fillStyle = sg; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(4,0,10,${0.30 + i * 0.055})`;
        ctx.fillRect(cx - cr, cy + (i / 8) * cr * 0.92, cr * 2, 5 + i * 0.4);
      }
      ctx.restore();
    }

    function drawGrid() {
      const gy = LH * 0.60; ctx.save();
      for (let i = 0; i < 6; i++) {
        const t = (i + 1) / 6, y = gy + (LH - gy) * t;
        ctx.strokeStyle = `rgba(0,60,200,${0.10 + t * 0.35})`;
        ctx.shadowColor = '#0044ff'; ctx.shadowBlur = t > 0.5 ? 4 : 0;
        ctx.lineWidth = 0.5 + t * 0.9;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LW, y); ctx.stroke();
      }
      const vp = LW / 2;
      for (let i = 0; i <= 12; i++) {
        const gx = (LW / 12) * i, hx = vp + (gx - vp) * 0.06;
        ctx.strokeStyle = 'rgba(30,0,160,0.20)'; ctx.shadowBlur = 0; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(hx, gy); ctx.lineTo(gx, LH); ctx.stroke();
      }
      const hg = ctx.createLinearGradient(0, gy - 10, 0, gy + 10);
      hg.addColorStop(0, 'transparent'); hg.addColorStop(0.5, 'rgba(100,0,200,0.20)'); hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg; ctx.fillRect(0, gy - 10, LW, 20); ctx.restore();
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

    function drawScores(pScore, aScore, leftLabel, rightLabel) {
      ctx.save(); ctx.textBaseline = 'top';
      ctx.font = "11px 'Orbitron', sans-serif";
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(0,229,255,0.45)'; ctx.fillText(leftLabel, LW / 2 - 14, 12);
      ctx.textAlign = 'left';  ctx.fillStyle = 'rgba(255,45,120,0.45)'; ctx.fillText(rightLabel, LW / 2 + 14, 12);
      ctx.font = "72px 'VT323', monospace";
      ctx.textAlign = 'right'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 22; ctx.fillStyle = '#00e5ff'; ctx.fillText(pScore, LW / 2 - 10, 24);
      ctx.textAlign = 'left';  ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 22; ctx.fillStyle = '#ff2d78'; ctx.fillText(aScore, LW / 2 + 10, 24);
      ctx.font = "9px 'Orbitron', sans-serif"; ctx.textAlign = 'center'; ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillText(`FIRST TO ${WIN_SCORE}`, LW / 2, 100);
      ctx.restore();
    }

    function drawCountdown(cdown) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.35 + (cdown % 1) * 0.65);
      ctx.font = "bold 88px 'VT323', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 28; ctx.fillStyle = '#00e5ff';
      ctx.fillText(Math.ceil(cdown), LW / 2, LH / 2 + 50); ctx.restore();
    }

    function drawGameOver(winner, wonMsg, lostMsg) {
      ctx.save();
      ctx.globalAlpha = 0.62; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH); ctx.globalAlpha = 1;
      const iWon = isHost ? winner === 'player' : winner === 'ai';
      const col  = iWon ? '#00ffcc' : '#ff2d78';
      ctx.shadowColor = col; ctx.shadowBlur = 50;
      ctx.font = "bold 68px 'Orbitron', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
      ctx.fillText(iWon ? wonMsg : lostMsg, LW / 2, LH / 2 - 30);
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

    function drawScanlines() {
      ctx.save(); ctx.globalAlpha = 0.04;
      for (let y = 0; y < LH; y += 4) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, LW, 2); }
      ctx.restore();
    }

    // ── Update ─────────────────────────────────────────────────────────────────
    const myPaddle  = isHost ? 'pY' : 'aY';
    const leftLabel  = isHost ? 'YOU' : (opponentName || 'OPP');
    const rightLabel = isHost ? (opponentName || 'OPP') : 'YOU';
    const wonMsg  = 'YOU WIN!';
    const lostMsg = `${opponentName || 'OPP'} WINS`;

    // Opponent paddle tracks at 2× player speed so it visually catches up fast
    // without ever looking "teleport-y". On large gaps (e.g. first frame) we snap.
    function smoothPad(current, target, dt) {
      const diff = target - current;
      if (Math.abs(diff) > 150) return target;
      // frame-rate independent lerp
      return current + diff * (1 - Math.exp(-dt * 20));
    }

    function update(dt, s) {
      const dt_60 = dt * 60;
      s.tick++;

      // ── Own paddle movement ──
      const inp = inputRef.current;
      if (inp.touchY !== null) {
        s[myPaddle] = Math.max(0, Math.min(LH - PAD_H, inp.touchY - PAD_H / 2));
      } else {
        if (inp.up)   s[myPaddle] = Math.max(0,          s[myPaddle] - PLAYER_SPD * dt_60);
        if (inp.down) s[myPaddle] = Math.min(LH - PAD_H, s[myPaddle] + PLAYER_SPD * dt_60);
      }
      socket.emit('pong-paddle', { room, y: s[myPaddle] });

      if (s.phase === 'gameover') return;

      // ── Authority Determination ──
      // Host handles countdown and ball moving left (towards them).
      // Guest handles ball moving right (towards them).
      const isAuthority = (isHost && s.ball.vx <= 0) || (!isHost && s.ball.vx > 0);

      if (s.phase === 'countdown') {
        s.cdown -= dt;
        if (s.cdown <= 0) s.phase = 'playing';
        // Host initializes ball for everyone
        if (isHost) {
          if (!s.ball.vx) s.ball = newBall(Math.random() < 0.5 ? 1 : -1);
          socket.emit('pong-ball', { room, ...s.ball });
        }
        return;
      }

      // ── Physics ──
      if (isAuthority) {
        // Authoritative movement
        s.ball.x += s.ball.vx * dt_60;
        s.ball.y += s.ball.vy * dt_60;

        // Y Walls
        if (s.ball.y - BALL_R <= 0)  { s.ball.y = BALL_R;      s.ball.vy =  Math.abs(s.ball.vy); }
        if (s.ball.y + BALL_R >= LH) { s.ball.y = LH - BALL_R; s.ball.vy = -Math.abs(s.ball.vy); }

        // Paddle Collision (only for own paddle)
        if (isHost && s.ball.vx < 0) {
          // Left paddle (Host)
          if (s.ball.x - BALL_R <= P_RIGHT && s.ball.x + BALL_R >= P_RIGHT - PAD_W) {
            if (s.ball.y >= s.pY - BALL_R && s.ball.y <= s.pY + PAD_H + BALL_R) {
              s.ball.x = P_RIGHT + BALL_R + 1;
              applyBounce(s.ball, s.pY, 1);
            }
          }
        } else if (!isHost && s.ball.vx > 0) {
          // Right paddle (Guest)
          if (s.ball.x + BALL_R >= A_LEFT && s.ball.x - BALL_R <= A_LEFT + PAD_W) {
            if (s.ball.y >= s.aY - BALL_R && s.ball.y <= s.aY + PAD_H + BALL_R) {
              s.ball.x = A_LEFT - BALL_R - 1;
              applyBounce(s.ball, s.aY, -1);
            }
          }
        }

        // Scoring (only against self)
        if (isHost && s.ball.x < -40) {
          s.aScore++;
          socket.emit('pong-point', { room, leftScore: s.pScore, rightScore: s.aScore });
          onPoint({ leftScore: s.pScore, rightScore: s.aScore }); // Update locally
        } else if (!isHost && s.ball.x > LW + 40) {
          s.pScore++;
          socket.emit('pong-point', { room, leftScore: s.pScore, rightScore: s.aScore });
          onPoint({ leftScore: s.pScore, rightScore: s.aScore }); // Update locally
        }

        // Emit state
        socket.emit('pong-ball', { room, ...s.ball });
      } else {
        // Non-authoritative: Smoothly track the remote ball
        const rb = remoteBallRef.current;
        if (rb) {
          // Dead reckoning for the time since last packet
          const age = (performance.now() - rb.ts) / 1000;
          const extX = rb.x + rb.vx * (age * 60);
          const extY = rb.y + rb.vy * (age * 60);
          
          // Soft correction (lerp)
          s.ball.x += (extX - s.ball.x) * 0.25;
          s.ball.y += (extY - s.ball.y) * 0.25;
          s.ball.vx = rb.vx;
          s.ball.vy = rb.vy;
          s.ball.spd = rb.spd;
          s.ball.hits = rb.hits;
        } else {
          // Fallback simple prediction if no packet yet
          s.ball.x += s.ball.vx * dt_60;
          s.ball.y += s.ball.vy * dt_60;
        }
      }

      // Update opponent visual paddle
      if (remoteOppPadRef.current !== null) {
        if (isHost) oppPadVisualRef.current = smoothPad(oppPadVisualRef.current, remoteOppPadRef.current, dt);
        else s.pY = smoothPad(s.pY, remoteOppPadRef.current, dt);
      }
    }

    function draw(s, oppLeft) {
      ctx.clearRect(0, 0, LW, LH);
      drawCenterLine();
      drawPaddle(PAD_MARGIN, s.pY, '#00e5ff');
      // Host: render guest paddle at the smoothed visual position (not raw physics value)
      // Guest: render own paddle directly, opponent paddle already smoothed via smoothPad()
      const rightY = isHost ? oppPadVisualRef.current : s.aY;
      drawPaddle(LW - PAD_MARGIN - PAD_W, rightY, '#ff2d78');
      if (s.phase !== 'gameover') drawBall(s.ball, s.tick);
      drawScores(s.pScore, s.aScore, leftLabel, rightLabel);
      if (s.phase === 'countdown') drawCountdown(s.cdown);
      if (s.phase === 'gameover' && !oppLeft) drawGameOver(s.winner, wonMsg, lostMsg);
      if (oppLeft) drawOppLeft();
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      update(dt, s);
      draw(s, oppLeftRef.current);
      if (s.tick % 4 === 0) {
        setUi({ pScore: s.pScore, aScore: s.aScore, phase: s.phase, winner: s.winner, oppLeft: oppLeftRef.current });
      }
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current  = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
