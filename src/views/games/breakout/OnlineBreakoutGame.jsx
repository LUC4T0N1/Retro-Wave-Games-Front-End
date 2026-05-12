import { useEffect, useRef, useState, useCallback } from 'react';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import isMobile from '../../../utils/isMobile';

const BASE_W = 480;
const BASE_H = 560;
const BRICK_COLS = 9;
const BRICK_GAP = 5;
const BRICK_H = 18;
const BRICK_TOP = 70;
const PADDLE_H = 12;
const BALL_R = 7;

const ROW_COLORS = [
  '#ff00aa', '#ff2d78', '#ff6622', '#ffb852',
  '#ffee00', '#00ffcc', '#00e5ff', '#cc00ff', '#7700ff',
];

function getBallSpeed(level) { return Math.min(520, 240 + (level - 1) * 32); }
function getPaddleW(level)   { return Math.max(58, 108 - (level - 1) * 6); }
function getPaddleY()        { return BASE_H - 44; }
function getBrickW()         { return (BASE_W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS; }

function buildBricks(level) {
  const rows   = Math.min(3 + level, 9);
  const brickW = getBrickW();
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const hp    = r < 2 && level >= 4 ? 2 : 1;
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

function buildState(level = 1, score = 0) {
  const pw = getPaddleW(level);
  const px = BASE_W / 2 - pw / 2;
  const py = getPaddleY();
  return {
    level, score,
    paddle: { x: px, y: py, w: pw, h: PADDLE_H },
    ball: { x: BASE_W / 2, y: py - BALL_R - 1, vx: 0, vy: 0 },
    bricks: buildBricks(level),
    launched: false,
    status: 'idle',      // 'idle' | 'playing' | 'waiting-level' | 'gameover'
    myLaunchReady: false,
    myLevelDone: false,
  };
}

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

export default function OnlineBreakoutGame({ socket, room, opponentName }) {
  const canvasRef      = useRef(null);
  const myStateRef     = useRef(null);
  const oppStateRef    = useRef(null);
  const animRef        = useRef(null);
  const lastTRef       = useRef(0);
  const stateBcastRef  = useRef(0);
  const resultRef      = useRef(null);
  const myReadyRef     = useRef(false);   // play-again ready
  const oppReadyRef    = useRef(false);   // play-again ready
  const oppLaunchReadyRef = useRef(false); // opponent pressed space to launch
  const oppLevelDoneRef   = useRef(false); // opponent cleared their level
  const keysRef        = useRef({});
  const scaleRef       = useRef(1);
  const oppCanvasRef   = useRef(null);
  const oppScaleRef    = useRef(0.15);

  const [result, setResult]                 = useState(null);
  const [waitingRestart, setWaitingRestart] = useState(false);

  // ── Drawing ───────────────────────────────────────────────────────────────
  const drawBoard = useCallback((ctx, s, ox, oy, isOpp, scale) => {
    ctx.save();
    ctx.translate(ox, oy);

    const W = BASE_W * scale;
    const H = BASE_H * scale;

    ctx.fillStyle = 'rgba(5,0,16,0.82)';
    fillRRect(ctx, 0, 0, W, H, 12 * scale);

    ctx.save();
    ctx.strokeStyle = isOpp ? '#ff2d78' : '#ffb852';
    ctx.lineWidth = 2 * scale;
    ctx.shadowColor = isOpp ? '#ff2d78' : '#ffb852';
    ctx.shadowBlur = 14 * scale;
    ctx.strokeRect(1 * scale, 1 * scale, W - 2 * scale, H - 2 * scale);
    ctx.restore();

    // Bricks
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

    // Ball
    ctx.save();
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 18 * scale;
    ctx.beginPath();
    ctx.arc(s.ball.x * scale, s.ball.y * scale, BALL_R * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Paddle
    const pd = s.paddle;
    ctx.save();
    ctx.fillStyle = isOpp ? '#ff2d78' : '#ffb852';
    ctx.shadowColor = isOpp ? '#ff2d78' : '#ffb852';
    ctx.shadowBlur = 20 * scale;
    fillRRect(ctx, pd.x * scale, pd.y * scale, pd.w * scale, pd.h * scale, 6 * scale);
    ctx.restore();

    // Status messages (only on my board)
    if (!isOpp && (s.status === 'idle' || s.status === 'waiting-level')) {
      ctx.save();
      ctx.fillStyle = 'rgba(5,0,16,0.60)';
      ctx.fillRect(0, BASE_H * scale * 0.35, W, 90 * scale);

      let line1, line2;
      if (s.status === 'waiting-level') {
        line1 = 'LEVEL CLEAR!';
        line2 = 'WAITING FOR OPPONENT...';
        ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00';
      } else if (s.myLaunchReady) {
        line1 = 'READY!';
        line2 = 'WAITING FOR OPPONENT...';
        ctx.fillStyle = '#ffb852'; ctx.shadowColor = '#ffb852';
      } else {
        line1 = `LEVEL ${s.level}`;
        line2 = isMobile ? 'TAP TO READY' : 'SPACE TO READY';
        ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc';
      }

      ctx.shadowBlur = 16 * scale;
      ctx.font = `bold ${20 * scale}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(line1, W / 2, BASE_H * scale * 0.44);
      ctx.font = `bold ${14 * scale}px 'Courier New', monospace`;
      ctx.globalAlpha = 0.85;
      ctx.fillText(line2, W / 2, BASE_H * scale * 0.44 + 26 * scale);
      ctx.restore();
    }

    // Spectating overlays
    if (!isOpp && s.status === 'gameover' && !resultRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${24 * scale}px Orbitron, sans-serif`;
      ctx.fillText('DIED - SPECTATING', W / 2, H / 2);
      ctx.restore();
    }

    if (isOpp && s.status === 'dead' && !resultRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'center';
      ctx.font = `bold ${24 * scale}px Orbitron, sans-serif`;
      ctx.fillText('OPPONENT DIED', W / 2, H / 2);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const s   = myStateRef.current;
    const opp = oppStateRef.current;
    if (!s || !opp) return;

    if (isMobile) {
      const myCV  = canvasRef.current;
      const oppCV = oppCanvasRef.current;
      if (!myCV || !oppCV) return;
      const myCtx  = myCV.getContext('2d');
      const oppCtx = oppCV.getContext('2d');
      const myScale  = scaleRef.current;
      const oppScale = oppScaleRef.current;
      const MY_LABEL_H = 18, MY_SCORE_H = 16, OPP_LABEL_H = 14;

      myCtx.clearRect(0, 0, myCV.width, myCV.height);
      oppCtx.clearRect(0, 0, oppCV.width, oppCV.height);

      drawBoard(myCtx, s, 0, MY_LABEL_H, false, myScale);

      myCtx.save();
      myCtx.font = 'bold 11px Orbitron, sans-serif';
      myCtx.fillStyle = '#ffb852'; myCtx.shadowColor = '#ffb852'; myCtx.shadowBlur = 6;
      myCtx.textAlign = 'center';
      myCtx.fillText('YOU', myCV.width / 2, MY_LABEL_H - 4);
      myCtx.fillStyle = '#fff'; myCtx.shadowBlur = 0;
      myCtx.fillText(`LV.${s.level}  SCORE: ${s.score}`, myCV.width / 2, MY_LABEL_H + BASE_H * myScale + MY_SCORE_H - 3);
      myCtx.restore();

      drawBoard(oppCtx, opp, 0, OPP_LABEL_H, true, oppScale);

      oppCtx.save();
      oppCtx.font = 'bold 9px Orbitron, sans-serif';
      oppCtx.fillStyle = '#ff2d78'; oppCtx.shadowColor = '#ff2d78'; oppCtx.shadowBlur = 4;
      oppCtx.textAlign = 'center';
      oppCtx.fillText(`${opponentName.toUpperCase().substring(0, 8)}  SCR:${opp.score}`, oppCV.width / 2, OPP_LABEL_H - 2);
      oppCtx.restore();

    } else {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);

      const gap    = 40;
      const scale  = scaleRef.current;
      const boardW = BASE_W * scale;
      const boardH = BASE_H * scale;
      const totalW = boardW * 2 + gap;
      const sx     = W / 2 - totalW / 2;
      const sy     = H / 2 - boardH / 2 + 30;

      drawBoard(ctx, s,   sx,               sy, false, scale);
      drawBoard(ctx, opp, sx + boardW + gap, sy, true,  scale);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px Orbitron, sans-serif';

      ctx.fillStyle = '#ffb852'; ctx.shadowColor = '#ffb852'; ctx.shadowBlur = 8;
      ctx.fillText('YOU', sx + boardW / 2, sy - 14);
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.fillText(`LV.${s.level}  SCORE: ${s.score}`, sx + boardW / 2, sy + boardH + 24);

      ctx.fillStyle = '#ff2d78'; ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 8;
      ctx.fillText(opponentName.toUpperCase(), sx + boardW + gap + boardW / 2, sy - 14);
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.fillText(`LV.${opp.level}  SCORE: ${opp.score}`, sx + boardW + gap + boardW / 2, sy + boardH + 24);

      ctx.restore();
    }
  }, [drawBoard, opponentName]);

  // ── doLaunch: actually fire the ball ──────────────────────────────────────
  const doLaunch = useCallback(() => {
    const s = myStateRef.current;
    if (!s || s.status !== 'idle') return;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    s.ball.vx = Math.cos(angle);
    s.ball.vy = Math.sin(angle);
    s.launched = true;
    s.status = 'playing';
    s.myLaunchReady = false;
    oppLaunchReadyRef.current = false;
  }, []);

  // ── doAdvanceLevel: move to next level ───────────────────────────────────
  const doAdvanceLevel = useCallback(() => {
    const s = myStateRef.current;
    if (!s) return;
    s.level++;
    s.bricks = buildBricks(s.level);
    const pw = getPaddleW(s.level);
    s.paddle = { x: BASE_W / 2 - pw / 2, y: getPaddleY(), w: pw, h: PADDLE_H };
    s.ball   = { x: BASE_W / 2, y: getPaddleY() - BALL_R - 1, vx: 0, vy: 0 };
    s.launched = false;
    s.status = 'idle';
    s.myLaunchReady = false;
    s.myLevelDone = false;
    oppLaunchReadyRef.current = false;
    oppLevelDoneRef.current = false;
  }, []);

  // ── signalReady: press SPACE → I'm ready to launch ───────────────────────
  const signalReady = useCallback(() => {
    const s = myStateRef.current;
    if (!s || s.status !== 'idle' || s.myLaunchReady || resultRef.current) return;
    s.myLaunchReady = true;
    socket.emit('breakout-launch-ready', { room });
    if (oppLaunchReadyRef.current) doLaunch();
  }, [socket, room, doLaunch]);

  // ── doRestart ────────────────────────────────────────────────────────────
  const doRestart = useCallback(() => {
    myStateRef.current  = buildState();
    oppStateRef.current = buildState();
    lastTRef.current    = performance.now();
    resultRef.current   = null;
    myReadyRef.current  = false;
    oppReadyRef.current = false;
    oppLaunchReadyRef.current = false;
    oppLevelDoneRef.current   = false;
    setResult(null);
    setWaitingRestart(false);
  }, []);

  const handleRestartReady = useCallback(() => {
    myReadyRef.current = true;
    socket.emit('breakout-restart-ready', { room });
    if (oppReadyRef.current) doRestart();
    else setWaitingRestart(true);
  }, [socket, room, doRestart]);

  // ── Main effect ───────────────────────────────────────────────────────────
  const checkGameOver = useCallback(() => {
    const s = myStateRef.current;
    const opp = oppStateRef.current;
    if (s && opp && s.status === 'gameover' && opp.status === 'dead') {
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

  useEffect(() => {
    myStateRef.current  = buildState();
    oppStateRef.current = buildState();
    lastTRef.current    = performance.now();
    resultRef.current   = null;

    const onResize = () => {
      const myCV  = canvasRef.current;
      const oppCV = oppCanvasRef.current;
      if (isMobile) {
        const W = window.innerWidth, H = window.innerHeight;
        const HOME_H = 48, MY_LABEL_H = 18, MY_SCORE_H = 16, OPP_LABEL_H = 14, GAP = 6, MARG = 4;
        const OPP_SCALE = 0.15;
        const oppAreaH = OPP_LABEL_H + BASE_H * OPP_SCALE;
        const avH = H - HOME_H - MY_LABEL_H - MY_SCORE_H - GAP - oppAreaH - MARG;
        const myScale = Math.min((W - MARG * 2) / BASE_W, avH / BASE_H);
        scaleRef.current = myScale;
        oppScaleRef.current = OPP_SCALE;
        if (myCV) {
          myCV.width  = Math.round(BASE_W * myScale);
          myCV.height = Math.round(BASE_H * myScale + MY_LABEL_H + MY_SCORE_H);
        }
        if (oppCV) {
          oppCV.width  = Math.round(BASE_W * OPP_SCALE);
          oppCV.height = Math.round(BASE_H * OPP_SCALE + OPP_LABEL_H);
        }
      } else {
        if (myCV) {
          myCV.width  = window.innerWidth;
          myCV.height = window.innerHeight;
        }
        const maxW = (window.innerWidth - 40) / 2 * 0.96;
        const maxH = window.innerHeight * 0.8;
        scaleRef.current = Math.min(maxW / BASE_W, maxH / BASE_H, 1);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);

    // Socket handlers
    const onState = ({ paddle, ball, bricks, score, level, status }) => {
      const o = oppStateRef.current;
      if (!o) return;
      o.paddle = paddle; o.ball = ball; o.bricks = bricks;
      o.score  = score;  o.level = level;
      if (status) o.status = status;
    };
    const onOppDied = ({ score }) => {
      const opp = oppStateRef.current;
      if (opp) {
        opp.status = 'dead';
        if (score !== undefined) opp.score = score;
      }
      checkGameOver();
      const s = myStateRef.current;
      if (s && s.status === 'waiting-level') doAdvanceLevel();
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
    // Opponent signalled they're ready to launch
    const onOppLaunchReady = () => {
      oppLaunchReadyRef.current = true;
      const s = myStateRef.current;
      if (s && s.myLaunchReady) doLaunch();
    };
    // Opponent cleared their level
    const onOppLevelDone = () => {
      oppLevelDoneRef.current = true;
      const s = myStateRef.current;
      if (s && s.myLevelDone) doAdvanceLevel();
    };

    socket.on('breakout-state',           onState);
    socket.on('breakout-opp-died',        onOppDied);
    socket.on('breakout-opp-left',        onOppLeft);
    socket.on('breakout-restart-ready',   onRestartReady);
    socket.on('breakout-opp-launch-ready', onOppLaunchReady);
    socket.on('breakout-opp-level-done',  onOppLevelDone);

    // Controls
    const handleKeyDown = (e) => {
      if (resultRef.current) return;
      keysRef.current[e.key] = true;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); signalReady(); }
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e) => { keysRef.current[e.key] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    // Game loop
    const loop = (ts) => {
      animRef.current = requestAnimationFrame(loop);
      const s = myStateRef.current;

      if (s && !resultRef.current) {
        const rawDt = Math.min((ts - lastTRef.current) / 1000, 0.05);
        lastTRef.current = ts;

        if (s.status === 'playing') {
          const spd = getBallSpeed(s.level);
          let { x, y, vx, vy } = s.ball;
          const pd = s.paddle;

          // Paddle movement
          const pdSpd = 420;
          if (keysRef.current['ArrowLeft']  || keysRef.current['a'] || keysRef.current['A']) pd.x = Math.max(0,             pd.x - pdSpd * rawDt);
          if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) pd.x = Math.min(BASE_W - pd.w, pd.x + pdSpd * rawDt);

          // Sub-step physics
          const steps = 3, dt = rawDt / steps;
          let dead = false;

          for (let step = 0; step < steps && !dead; step++) {
            x += vx * spd * dt;
            y += vy * spd * dt;

            if (x - BALL_R < 0)       { x = BALL_R;          vx =  Math.abs(vx); }
            if (x + BALL_R > BASE_W)  { x = BASE_W - BALL_R; vx = -Math.abs(vx); }
            if (y - BALL_R < 0)       { y = BALL_R;           vy =  Math.abs(vy); }

            if (vy > 0 && y + BALL_R >= pd.y && y - BALL_R <= pd.y + pd.h && x >= pd.x - BALL_R && x <= pd.x + pd.w + BALL_R) {
              y  = pd.y - BALL_R;
              vy = -Math.abs(vy);
              const rel = (x - (pd.x + pd.w / 2)) / (pd.w / 2);
              vx = rel * 1.2;
              const len = Math.sqrt(vx * vx + vy * vy);
              vx /= len; vy /= len;
            }

            for (const b of s.bricks) {
              if (!b.alive) continue;
              const ol = x + BALL_R - b.x, or2 = b.x + b.w - (x - BALL_R);
              const ot = y + BALL_R - b.y, ob  = b.y + b.h - (y - BALL_R);
              if (ol > 0 && or2 > 0 && ot > 0 && ob > 0) {
                b.hp--;
                if (b.hp <= 0) { b.alive = false; s.score += 10 * s.level; }
                const minO = Math.min(ol, or2, ot, ob);
                if (minO === ot || minO === ob) vy = -vy; else vx = -vx;
                break;
              }
            }

            if (y - BALL_R > BASE_H) dead = true;
          }

          s.ball.x = x; s.ball.y = y; s.ball.vx = vx; s.ball.vy = vy;

          if (dead) {
            // 1 life only — falling ball = instant game over
            s.status = 'gameover';
            socket.emit('breakout-died', { room, score: s.score });
            checkGameOver();
          } else if (s.bricks.every(b => !b.alive)) {
            // Level cleared — wait for opponent before advancing
            s.myLevelDone = true;
            socket.emit('breakout-level-done', { room });
            const opp = oppStateRef.current;
            if (oppLevelDoneRef.current || opp?.status === 'dead') doAdvanceLevel();
            else s.status = 'waiting-level';
          }
        }

        // Broadcast state at ~10fps
        if (ts - stateBcastRef.current > 100) {
          socket.emit('breakout-state', {
            room,
            paddle: s.paddle, ball: s.ball, bricks: s.bricks,
            score:  s.score,  level: s.level, status: s.status,
          });
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
      window.removeEventListener('resize',  onResize);
      socket.off('breakout-state',            onState);
      socket.off('breakout-opp-died',         onOppDied);
      socket.off('breakout-opp-left',         onOppLeft);
      socket.off('breakout-restart-ready',    onRestartReady);
      socket.off('breakout-opp-launch-ready', onOppLaunchReady);
      socket.off('breakout-opp-level-done',   onOppLevelDone);
      socket.emit('breakout-leave', { room });
    };
  }, [socket, room, render, doRestart, doLaunch, doAdvanceLevel, signalReady, checkGameOver]);

  // ── Touch / mouse paddle control ─────────────────────────────────────────
  const getLocalX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect  = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    if (isMobile) {
      return (clientX - rect.left) / scale;
    }
    const boardW = BASE_W * scale;
    const totalW = boardW * 2 + 40;
    const sx     = canvas.width / 2 - totalW / 2;
    return (clientX - rect.left - sx) / scale;
  };

  const movePaddle = (clientX) => {
    const s = myStateRef.current;
    if (!s || resultRef.current) return;
    const localMx = getLocalX(clientX);
    s.paddle.x = Math.max(0, Math.min(BASE_W - s.paddle.w, localMx - s.paddle.w / 2));
    if (!s.launched) s.ball.x = s.paddle.x + s.paddle.w / 2;
  };

  const handleMouseMove  = (e) => movePaddle(e.clientX);
  const handleTouchMove  = (e) => { e.preventDefault(); movePaddle(e.touches[0].clientX); };

  // ── Result overlay ────────────────────────────────────────────────────────
  const resultColor = result === 'win' ? '#ffb852' : result === 'tie' ? '#ffe066' : result === 'opp-left' ? '#00ffcc' : '#ff2d78';
  const resultText  = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'YOU LOSE' : result === 'tie' ? 'TIE!' : 'OPPONENT LEFT';

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      {isMobile ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', touchAction: 'none' }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onClick={signalReady}
            onTouchStart={signalReady}
          />
          <canvas
            ref={oppCanvasRef}
            style={{ display: 'block', marginTop: 6 }}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ position: 'relative', zIndex: 10, display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onClick={signalReady}
          onTouchStart={signalReady}
        />
      )}

      <HomeButton />

      {result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,0,16,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 72, color: resultColor, letterSpacing: '0.1em', textShadow: `0 0 30px ${resultColor}, 0 0 60px ${resultColor}55` }}>
            {resultText}
          </div>

          {result !== 'opp-left' && (
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
              {[
                { label: 'YOU', score: myStateRef.current?.score ?? 0, color: '#ffb852' },
                { label: opponentName.substring(0, 10).toUpperCase(), score: oppStateRef.current?.score ?? 0, color: '#ff2d78' },
              ].map(({ label, score, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color, opacity: 0.8, letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 42, color: '#fff', textShadow: `0 0 10px ${color}` }}>{score}</div>
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
                style={{ padding: '12px 28px', background: waitingRestart ? 'rgba(255,184,82,0.1)' : 'rgba(4,0,18,0.65)', border: '2px solid #ffb852', borderRadius: 3, color: waitingRestart ? '#fff' : '#ffb852', fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', cursor: waitingRestart ? 'default' : 'pointer', textTransform: 'uppercase', boxShadow: waitingRestart ? 'none' : '0 0 12px rgba(255,184,82,0.3)' }}
                onMouseEnter={e => { if (!waitingRestart) { e.currentTarget.style.background = '#ffb85222'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!waitingRestart) { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = '#ffb852'; } }}
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
