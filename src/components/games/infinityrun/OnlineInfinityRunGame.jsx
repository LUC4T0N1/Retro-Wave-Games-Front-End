import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';
import isMobile from '../../../utils/isMobile';

// ── Constants ─────────────────────────────────────────────────────────────
const LW = 800, LH = 270;
const OPP_Y   = LH + 8;
const TOTAL_H = LH * 2 + 8;
const GROUND_Y  = 226;
const GRAVITY   = 0.58;
const JUMP_VY   = -13.8;
const DJUMP_VY  = -11.5;
const MONKEY_W  = 36, MONKEY_H  = 52;
const MONKEY_DW = 52, MONKEY_DH = 28;
const MONKEY_X  = 90;
const INIT_SPEED = 5;
const MAX_SPEED  = 22;
const SPEED_RAMP = 0.0018;

const OBS = {
  cactus_tall:  { w: 22, h: 78, yOff: 0 },
  cactus_short: { w: 42, h: 44, yOff: 0 },
  cactus_pair:  { w: 58, h: 68, yOff: 0 },
  bird:         { w: 46, h: 30, yOff: 32 },
};
const OBS_KEYS = Object.keys(OBS);

function makeState() {
  return {
    monkey: { y: GROUND_Y - MONKEY_H, vy: 0, onGround: true, ducking: false, jumpsLeft: 2, animTick: 0 },
    obstacles: [],
    score: 0,
    speed: INIT_SPEED,
    dist: 0,
    nextObs: 500,
    status: 'playing',
    tick: 0,
  };
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function OnlineInfinityRunGame({ socket, room, opponentName, myName = 'YOU' }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const oppRef     = useRef({ monkeyY: GROUND_Y - MONKEY_H, ducking: false, score: 0, speed: INIT_SPEED, dist: 0, obstacles: [] });
  const animRef    = useRef(null);
  const lastTRef   = useRef(0);
  const inputRef   = useRef({ jumpQ: 0, duckHeld: false });
  const myReadyRef  = useRef(false);
  const oppReadyRef = useRef(false);
  const resultRef   = useRef(null);
  const navigate    = useNavigate();

  const [result, setResult]       = useState(null);
  const [myReady, setMyReady]     = useState(false);

  const canvasScale = isMobile ? Math.min((window.innerWidth * 0.94) / LW, (window.innerHeight * 0.8) / TOTAL_H) : 1;
  const [resultData, setResultData] = useState({ myScore: 0, oppScore: 0 });

  const doRestart = useCallback(() => {
    stateRef.current  = makeState();
    oppRef.current    = { monkeyY: GROUND_Y - MONKEY_H, ducking: false, score: 0, speed: INIT_SPEED, dist: 0, obstacles: [] };
    myReadyRef.current  = false;
    oppReadyRef.current = false;
    resultRef.current   = null;
    setResult(null);
    setMyReady(false);
  }, []);

  const checkGameOver = useCallback(() => {
    const s = stateRef.current;
    const opp = oppRef.current;
    if (s && opp && s.status === 'dead' && opp.status === 'dead') {
      if (resultRef.current) return;
      const myScore = Math.floor(s.score);
      const oppScore = Math.floor(opp.score);
      setResultData({ myScore, oppScore });

      if (myScore > oppScore) {
        resultRef.current = 'win';
        setResult('win');
      } else if (myScore < oppScore) {
        resultRef.current = 'lose';
        setResult('lose');
      } else {
        resultRef.current = 'tie';
        setResult('tie');
      }
    }
  }, []);

  // ── Socket events ──────────────────────────────────────────────────────
  useEffect(() => {
    const onState = ({ monkeyY, ducking, score, speed, dist, obstacles }) => {
      oppRef.current = { monkeyY, ducking, score, speed, dist: dist || 0, obstacles: obstacles || [] };
    };
    const onOppDied = ({ score }) => {
      const opp = oppRef.current;
      if (opp) {
        opp.status = 'dead';
        if (score !== undefined) opp.score = score;
      }
      checkGameOver();
    };

    const onOppLeft = () => {
      if (resultRef.current) return;
      if (oppRef.current?.status === 'dead') return;
      resultRef.current = 'opp-left';
      setResult('opp-left');
      setResultData({ myScore: Math.floor(stateRef.current?.score || 0), oppScore: 0 });
    };

    const onRestartReady = () => {
      oppReadyRef.current = true;
      if (myReadyRef.current) doRestart();
    };

    socket.on('infrun-state',         onState);
    socket.on('infrun-opp-died',      onOppDied);
    socket.on('infrun-opp-left',      onOppLeft);
    socket.on('infrun-restart-ready', onRestartReady);

    return () => {
      socket.off('infrun-state',         onState);
      socket.off('infrun-opp-died',      onOppDied);
      socket.off('infrun-opp-left',      onOppLeft);
      socket.off('infrun-restart-ready', onRestartReady);
      socket.emit('infrun-leave', { room });
    };
  }, [socket, room, doRestart, checkGameOver]);

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      if (stateRef.current?.status !== 'playing' || resultRef.current) return;
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); if (!e.repeat) inputRef.current.jumpQ++; }
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.duckHeld = true;
    };
    const onUp = (e) => { if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.duckHeld = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // ── Touch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onStart = (e) => {
      if (stateRef.current?.status !== 'playing' || resultRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      if (y < window.innerHeight * 0.5) inputRef.current.jumpQ++;
      else inputRef.current.duckHeld = true;
    };
    const onEnd = () => { inputRef.current.duckHeld = false; };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, []);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => { stateRef.current = makeState(); }, []);

  // ── Game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── bg ─────────────────────────────────────────────────────────────
    function drawBg(tick, yOff) {
      const sky = ctx.createLinearGradient(0, yOff, 0, yOff + GROUND_Y);
      sky.addColorStop(0,    '#030010'); sky.addColorStop(0.35, '#0e0035');
      sky.addColorStop(0.65, '#55006a'); sky.addColorStop(0.85, '#cc0062');
      sky.addColorStop(1,    '#e6006c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, yOff, LW, GROUND_Y);

      const seeds = [17,53,89,131,173,211,257,313,379,431,499,563,631,709,787,863,941,1019,1097,1181,1259,1327];
      seeds.forEach((s, i) => {
        const x  = (s * 37 + i * 200) % LW;
        const y  = yOff + (s * 13 + i * 50) % (GROUND_Y * 0.62);
        const r  = s % 3 === 0 ? 1.5 : 0.8;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(tick * 0.017 + s * 0.1));
        ctx.save(); ctx.globalAlpha = tw * 0.85;
        ctx.fillStyle = s % 5 === 0 ? '#e0c8ff' : '#fff';
        if (s % 5 === 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      const sx = LW * 0.5, sy = yOff + GROUND_Y * 0.68, sr = 38;
      const og = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 2.8);
      og.addColorStop(0, 'rgba(255,70,0,0.45)'); og.addColorStop(0.4, 'rgba(180,0,80,0.18)'); og.addColorStop(1, 'transparent');
      ctx.fillStyle = og; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
      ctx.save();
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip();
      const sg = ctx.createLinearGradient(sx, sy - sr, sx, sy + sr);
      sg.addColorStop(0, '#ffee00'); sg.addColorStop(0.25, '#ff8800'); sg.addColorStop(0.55, '#ff2222'); sg.addColorStop(1, '#aa0044');
      ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      for (let i = 0; i < 8; i++) {
        const ly = sy + (i / 8) * sr * 0.9;
        ctx.fillStyle = `rgba(4,0,10,${0.32 + i * 0.055})`; ctx.fillRect(sx - sr, ly, sr * 2, 5 + i * 0.5);
      }
      ctx.restore();

      const farPts = [
        { x: -40, y: yOff+GROUND_Y }, { x: 30,  y: yOff+GROUND_Y-48  }, { x: 115, y: yOff+GROUND_Y-98  },
        { x: 220, y: yOff+GROUND_Y-70  }, { x: 320, y: yOff+GROUND_Y-118 }, { x: 430, y: yOff+GROUND_Y-82  },
        { x: 530, y: yOff+GROUND_Y-122 }, { x: 640, y: yOff+GROUND_Y-78  }, { x: 740, y: yOff+GROUND_Y-106 },
        { x: 840, y: yOff+GROUND_Y-55  },
      ];
      const nearPts = [
        { x: -20, y: yOff+GROUND_Y }, { x: 50,  y: yOff+GROUND_Y-28  }, { x: 130, y: yOff+GROUND_Y-68 },
        { x: 230, y: yOff+GROUND_Y-44  }, { x: 340, y: yOff+GROUND_Y-72  }, { x: 460, y: yOff+GROUND_Y-38 },
        { x: 570, y: yOff+GROUND_Y-76  }, { x: 680, y: yOff+GROUND_Y-52  }, { x: 790, y: yOff+GROUND_Y-30 },
        { x: 860, y: yOff+GROUND_Y },
      ];
      function buildMtn(pts) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i+1].x) / 2, my = (pts[i].y + pts[i+1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
      }
      ctx.save();
      const farFill = ctx.createLinearGradient(0, yOff+GROUND_Y-122, 0, yOff+GROUND_Y);
      farFill.addColorStop(0, '#1c0040'); farFill.addColorStop(1, '#110026');
      ctx.fillStyle = farFill; ctx.shadowColor = '#8800cc'; ctx.shadowBlur = 18;
      ctx.beginPath(); buildMtn(farPts); ctx.lineTo(LW+40, yOff+GROUND_Y); ctx.lineTo(-40, yOff+GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9900cc'; ctx.lineWidth = 1.5; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); buildMtn(farPts); ctx.stroke();
      ctx.restore();
      ctx.save();
      const nearFill = ctx.createLinearGradient(0, yOff+GROUND_Y-76, 0, yOff+GROUND_Y);
      nearFill.addColorStop(0, '#2a0058'); nearFill.addColorStop(1, '#160030');
      ctx.fillStyle = nearFill; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); buildMtn(nearPts); ctx.lineTo(LW+20, yOff+GROUND_Y); ctx.lineTo(-20, yOff+GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#cc00ff'; ctx.lineWidth = 1.8; ctx.shadowColor = '#ff44ff'; ctx.shadowBlur = 12;
      ctx.beginPath(); buildMtn(nearPts); ctx.stroke();
      ctx.restore();
    }

    // ── ground ─────────────────────────────────────────────────────────
    function drawGround(dist, yOff) {
      const gg = ctx.createLinearGradient(0, yOff+GROUND_Y, 0, yOff+LH);
      gg.addColorStop(0, '#15003e'); gg.addColorStop(1, '#060018');
      ctx.fillStyle = gg; ctx.fillRect(0, yOff+GROUND_Y, LW, LH-GROUND_Y);
      const spacing = 72, vp = LW/2, offset = dist % spacing;
      for (let i = -1; i < LW/spacing+3; i++) {
        const gx = i*spacing - offset;
        if (gx < -spacing || gx > LW+spacing) continue;
        const hx = vp + (gx-vp)*0.06, t = Math.abs(gx-vp)/(LW/2);
        ctx.strokeStyle = `rgba(0,50,200,${0.10+t*0.07})`; ctx.shadowBlur = 0; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(hx, yOff+GROUND_Y); ctx.lineTo(gx, yOff+LH); ctx.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const t = (i+1)/7, y = yOff+GROUND_Y+(LH-GROUND_Y)*t*t;
        ctx.strokeStyle = `rgba(0,75,210,${0.10+t*0.55})`;
        ctx.shadowColor = '#0055ff'; ctx.shadowBlur = t>0.6?4:1; ctx.lineWidth = 0.5+t*0.8;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(LW,y); ctx.stroke();
      }
      ctx.strokeStyle = '#0055ff'; ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 12; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, yOff+GROUND_Y); ctx.lineTo(LW, yOff+GROUND_Y); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ── my monkey (orange) ─────────────────────────────────────────────
    function drawMonkey(monkey, yOff) {
      const { y, ducking, onGround, animTick } = monkey;
      const O='#ff8c00', LO='#ffb84d', DO='#cc5000', G='#ff6600';
      ctx.save();
      if (ducking) {
        const bx=MONKEY_X-MONKEY_DW/2, by=yOff+y;
        ctx.strokeStyle=DO; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(bx+6,by+4); ctx.quadraticCurveTo(bx-14,by-8,bx-5,by-20); ctx.stroke();
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        rrPath(ctx,bx+5,by+2,MONKEY_DW-22,MONKEY_DH-4,6); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_DW-13,by+MONKEY_DH/2,14,0,Math.PI*2); ctx.fillStyle=O; ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle=DO;
        ctx.beginPath(); ctx.arc(bx+MONKEY_DW-24,by+MONKEY_DH/2-9,6.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff4488'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-24,by+MONKEY_DH/2-9,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=LO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_DW-10,by+MONKEY_DH/2+2,9,10,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-6,by+MONKEY_DH/2-3,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-5,by+MONKEY_DH/2-3,1.8,0,Math.PI*2); ctx.fill();
      } else {
        const bx=MONKEY_X-MONKEY_W/2, by=yOff+y, rs=Math.sin(animTick*0.24);
        ctx.strokeStyle=DO; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.shadowBlur=0;
        const tw=onGround?Math.sin(animTick*0.22)*7:0;
        ctx.beginPath(); ctx.moveTo(bx+2,by+MONKEY_H*0.55); ctx.quadraticCurveTo(bx-17,by+MONKEY_H*0.35+tw,bx-8,by+5); ctx.stroke();
        ctx.shadowColor=G; ctx.shadowBlur=8; ctx.fillStyle=O;
        const ll=onGround?Math.round(rs*9):0;
        ctx.fillRect(bx+4,by+MONKEY_H-20+(ll>0?0:-ll),11,20+(ll>0?ll:0));
        ctx.fillRect(bx+MONKEY_W-15,by+MONKEY_H-20+(ll>0?-ll:0),11,20+(ll>0?0:ll));
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        rrPath(ctx,bx+2,by+MONKEY_H*0.35,MONKEY_W-4,MONKEY_H*0.58,7); ctx.fill();
        const as=onGround?Math.round(rs*7):0;
        if (!onGround) { ctx.fillRect(bx-9,by+MONKEY_H*0.35,11,16); ctx.fillRect(bx+MONKEY_W-2,by+MONKEY_H*0.35,11,16); }
        else { ctx.fillRect(bx-7,by+MONKEY_H*0.42+as,11,17); ctx.fillRect(bx+MONKEY_W-4,by+MONKEY_H*0.42-as,11,17); }
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2,by+14,15,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle=DO;
        ctx.beginPath(); ctx.arc(bx+2,by+7,6.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W-2,by+7,6.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff4488';
        ctx.beginPath(); ctx.arc(bx+2,by+7,3.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W-2,by+7,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=LO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_W/2,by+18,9,11,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2-5,by+12,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2+5,by+12,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2-4,by+12,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2+6,by+12,2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=DO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_W/2,by+21,4.5,3,0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // ── opponent monkey (cyan) ─────────────────────────────────────────
    function drawOppMonkey(monkeyY, ducking, yOff) {
      const O='#00e5ff', LO='#88ffff', DO='#007799', G='#00ccff';
      ctx.save();
      if (ducking) {
        const bx=MONKEY_X-MONKEY_DW/2, by=yOff+monkeyY;
        ctx.strokeStyle=DO; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(bx+6,by+4); ctx.quadraticCurveTo(bx-14,by-8,bx-5,by-20); ctx.stroke();
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        rrPath(ctx,bx+5,by+2,MONKEY_DW-22,MONKEY_DH-4,6); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_DW-13,by+MONKEY_DH/2,14,0,Math.PI*2); ctx.fillStyle=O; ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle=DO;
        ctx.beginPath(); ctx.arc(bx+MONKEY_DW-24,by+MONKEY_DH/2-9,6.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#aa00ff'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-24,by+MONKEY_DH/2-9,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=LO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_DW-10,by+MONKEY_DH/2+2,9,10,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-6,by+MONKEY_DH/2-3,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#003355'; ctx.beginPath(); ctx.arc(bx+MONKEY_DW-5,by+MONKEY_DH/2-3,1.8,0,Math.PI*2); ctx.fill();
      } else {
        const bx=MONKEY_X-MONKEY_W/2, by=yOff+monkeyY;
        ctx.strokeStyle=DO; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(bx+2,by+MONKEY_H*0.55); ctx.quadraticCurveTo(bx-17,by+MONKEY_H*0.35,bx-8,by+5); ctx.stroke();
        ctx.shadowColor=G; ctx.shadowBlur=8; ctx.fillStyle=O;
        ctx.fillRect(bx+4,by+MONKEY_H-20,11,20); ctx.fillRect(bx+MONKEY_W-15,by+MONKEY_H-20,11,20);
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        rrPath(ctx,bx+2,by+MONKEY_H*0.35,MONKEY_W-4,MONKEY_H*0.58,7); ctx.fill();
        ctx.fillRect(bx-9,by+MONKEY_H*0.35,11,16); ctx.fillRect(bx+MONKEY_W-2,by+MONKEY_H*0.35,11,16);
        ctx.shadowColor=G; ctx.shadowBlur=14; ctx.fillStyle=O;
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2,by+14,15,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle=DO;
        ctx.beginPath(); ctx.arc(bx+2,by+7,6.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W-2,by+7,6.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#aa00ff';
        ctx.beginPath(); ctx.arc(bx+2,by+7,3.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W-2,by+7,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=LO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_W/2,by+18,9,11,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2-5,by+12,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2+5,by+12,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#003355';
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2-4,by+12,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx+MONKEY_W/2+6,by+12,2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=DO; ctx.beginPath(); ctx.ellipse(bx+MONKEY_W/2,by+21,4.5,3,0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // ── obstacles ──────────────────────────────────────────────────────
    function drawObstacle(obs, tick, yOff) {
      const { x, type, w, h, yOff: obsYOff } = obs;
      const top = yOff + GROUND_Y - obsYOff - h;
      ctx.save();
      if (type.startsWith('cactus')) {
        function cactSeg(rx, ry, rw, rh, r) {
          const g = ctx.createLinearGradient(rx, ry, rx+rw, ry);
          g.addColorStop(0,'#ff66ff'); g.addColorStop(0.35,'#cc00ff'); g.addColorStop(1,'#660099');
          ctx.fillStyle=g; ctx.shadowColor='#cc00ff'; ctx.shadowBlur=14;
          rrPath(ctx,rx,ry,rw,rh,r); ctx.fill();
          ctx.globalAlpha=0.26; ctx.fillStyle='#fff';
          rrPath(ctx,rx+2,ry+2,Math.max(2,rw*0.28),rh-4,r); ctx.fill();
          ctx.globalAlpha=1;
        }
        function spines(sx, sy, dir) {
          ctx.strokeStyle='#ff88ff'; ctx.lineWidth=1.1; ctx.shadowBlur=5;
          for (let i=0;i<3;i++) { const oy=(i-1)*4; ctx.beginPath(); ctx.moveTo(sx,sy+oy); ctx.lineTo(sx+dir*8,sy+oy-3+i*2); ctx.stroke(); }
        }
        const mid=x+w/2;
        if (type==='cactus_tall') {
          cactSeg(mid-30,top+h*0.10,22,10,4); cactSeg(mid-30,top+h*0.10,10,h*0.20,4);
          cactSeg(mid+8, top+h*0.28,22,10,4); cactSeg(mid+18,top+h*0.12,10,h*0.18,4);
          cactSeg(mid-9, top,18,h,7);
          spines(mid-30,top+h*0.10,-1); spines(mid-9,top+h*0.10,+1);
          spines(mid+8, top+h*0.28,-1); spines(mid+30,top+h*0.28,+1);
        } else if (type==='cactus_short') {
          cactSeg(mid-24,top+h*0.33,16,10,4); cactSeg(mid-16,top+h*0.14,9,h*0.22,4);
          cactSeg(mid+8, top+h*0.40,16,10,4); cactSeg(mid+7, top+h*0.22,9,h*0.20,4);
          cactSeg(mid-8,top,16,h,7);
          spines(mid-24,top+h*0.33,-1); spines(mid+24,top+h*0.40,+1);
        } else {
          const lx=x+4, rx2=x+w-22;
          cactSeg(lx-10,top+h*0.28,14,10,4); cactSeg(lx-10,top+h*0.14,8,h*0.16,4);
          cactSeg(lx,top+14,14,h-14,6); spines(lx-10,top+h*0.28,-1);
          cactSeg(rx2+14,top+h*0.20,14,10,4); cactSeg(rx2+14,top+h*0.06,8,h*0.16,4);
          cactSeg(rx2,top+6,14,h-6,6); spines(rx2+28,top+h*0.20,+1);
        }
      } else {
        const cx=x+w/2, cy=top+h/2, wb=Math.floor(tick/10)%2===0, wd=wb?8:-5;
        ctx.shadowColor='#00e5ff'; ctx.shadowBlur=22;
        ctx.fillStyle='#005588';
        ctx.beginPath(); ctx.moveTo(cx-w/2+8,cy-2); ctx.lineTo(cx-w/2-6,cy-8); ctx.lineTo(cx-w/2-2,cy+2); ctx.lineTo(cx-w/2-8,cy+6); ctx.lineTo(cx-w/2+8,cy+4); ctx.closePath(); ctx.fill();
        const wLG=ctx.createLinearGradient(cx-w/2,cy,cx,cy); wLG.addColorStop(0,'#0055aa'); wLG.addColorStop(1,'#00ccff');
        ctx.fillStyle=wLG; ctx.beginPath(); ctx.moveTo(cx-7,cy-2); ctx.quadraticCurveTo(cx-w/2,cy+wd,cx-w/2+6,cy-h/3+2); ctx.quadraticCurveTo(cx-14,cy-h/3-4,cx-7,cy-2); ctx.closePath(); ctx.fill();
        const wRG=ctx.createLinearGradient(cx,cy,cx+w/2,cy); wRG.addColorStop(0,'#00ccff'); wRG.addColorStop(1,'#0055aa');
        ctx.fillStyle=wRG; ctx.beginPath(); ctx.moveTo(cx+7,cy-2); ctx.quadraticCurveTo(cx+w/2,cy+wd,cx+w/2-6,cy-h/3+2); ctx.quadraticCurveTo(cx+14,cy-h/3-4,cx+7,cy-2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(0,210,255,0.38)'; ctx.lineWidth=0.9; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(cx-7,cy-2); ctx.lineTo(cx-w/2+6,cy-h/3+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+7,cy-2); ctx.lineTo(cx+w/2-6,cy-h/3+2); ctx.stroke();
        ctx.shadowColor='#00e5ff'; ctx.shadowBlur=14;
        const bG=ctx.createLinearGradient(cx,cy-h/2,cx,cy+h/2); bG.addColorStop(0,'#00ccff'); bG.addColorStop(1,'#0055aa');
        ctx.fillStyle=bG; ctx.beginPath(); ctx.ellipse(cx,cy,w/2-5,h/2-1,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#00aadd'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(cx+w/2-12,cy-4,10,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx+w/2-8,cy-6,3.8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#001133'; ctx.beginPath(); ctx.arc(cx+w/2-7,cy-6,2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx+w/2-6.4,cy-7,0.9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.moveTo(cx+w/2-2,cy-5); ctx.lineTo(cx+w/2+8,cy-2); ctx.lineTo(cx+w/2-2,cy+1); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // ── label ──────────────────────────────────────────────────────────
    function drawLabel(name, score, speed, yOff) {
      ctx.save();
      ctx.font = "bold 11px Orbitron, monospace";
      ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
      ctx.fillText(name.toUpperCase(), 10, yOff + 18);
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.fillText(Math.floor(score).toLocaleString(), 10, yOff + 34);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff8c00'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6;
      ctx.fillText(`${Math.round(speed * 10) / 10}x SPEED`, LW - 10, yOff + 18);
      ctx.textAlign = 'left'; ctx.restore();
    }

    function drawSeparator() {
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, LW, 0);
      g.addColorStop(0, 'transparent'); g.addColorStop(0.2, '#ff2d78');
      g.addColorStop(0.5, '#cc00ff'); g.addColorStop(0.8, '#00e5ff'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10;
      ctx.fillRect(0, LH, LW, 8);
      ctx.restore();
    }

    function drawScanlines() {
      ctx.save(); ctx.globalAlpha = 0.04;
      for (let y = 0; y < TOTAL_H; y += 4) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, LW, 2); }
      ctx.restore();
    }

    // ── update ─────────────────────────────────────────────────────────
    function update(dt, s) {
      if (s.status !== 'playing') return;
      const m = s.monkey, inp = inputRef.current, dt60 = dt * 60;
      m.ducking = inp.duckHeld && m.onGround;
      if (inp.jumpQ > 0) {
        inp.jumpQ = 0;
        if (m.jumpsLeft > 0) { m.vy = m.onGround ? JUMP_VY : DJUMP_VY; m.onGround = false; m.ducking = false; m.jumpsLeft--; }
      }
      m.vy += GRAVITY * dt60; m.y += m.vy * dt60;
      const floor = GROUND_Y - (m.ducking ? MONKEY_DH : MONKEY_H);
      if (m.y >= floor) { m.y = floor; m.vy = 0; m.onGround = true; m.jumpsLeft = 2; }
      if (m.onGround && !m.ducking) m.animTick += dt60;
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_RAMP * dt60);
      const px = s.speed * dt * 60;
      s.dist += px; s.score += s.speed * 0.1 * dt60;
      s.obstacles.forEach(o => { o.x -= px; });
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -30);
      if (s.dist >= s.nextObs) {
        const pool = s.speed > 9 ? OBS_KEYS : OBS_KEYS.filter(k => k !== 'bird');
        const key = pool[Math.floor(Math.random() * pool.length)];
        s.obstacles.push({ x: LW + 20, type: key, ...OBS[key] });
        const sn = Math.min(1, (s.speed - INIT_SPEED) / (MAX_SPEED - INIT_SPEED));
        // Slightly increased spacing at high speeds to allow recovery
        const minGap = 380 + sn * 100;
        const maxGap = 820 - sn * 180;
        s.nextObs = s.dist + minGap + Math.random() * Math.max(0, maxGap - minGap);
      }
      const pad=7, mH=m.ducking?MONKEY_DH:MONKEY_H, mHalf=(m.ducking?MONKEY_DW:MONKEY_W)/2;
      const mL=MONKEY_X-mHalf+pad, mR=MONKEY_X+mHalf-pad, mT=m.y+pad, mB=m.y+mH-pad;
      for (const o of s.obstacles) {
        if (mL < o.x+o.w-pad && mR > o.x+pad && mT < GROUND_Y-o.yOff-pad && mB > GROUND_Y-o.yOff-o.h+pad) {
          s.status = 'dead'; return;
        }
      }
      s.tick++;
    }

    // ── draw ───────────────────────────────────────────────────────────
    function draw(s) {
      const opp = oppRef.current;
      ctx.clearRect(0, 0, LW, TOTAL_H);
      s.obstacles.forEach(o => drawObstacle(o, s.tick, 0));
      drawMonkey(s.monkey, 0);
      drawLabel(myName, s.score, s.speed, 0);
      if (s.status === 'dead' && !resultRef.current) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LW, LH);
        ctx.globalAlpha = 1.0; ctx.fillStyle = '#ff2d78'; ctx.font = "bold 24px Orbitron, sans-serif"; ctx.textAlign = 'center';
        ctx.fillText('DIED - SPECTATING', LW / 2, LH / 2); ctx.restore();
      }
      drawSeparator();
      (opp.obstacles || []).forEach(o => drawObstacle(o, s.tick, OPP_Y));
      drawOppMonkey(opp.monkeyY ?? GROUND_Y - MONKEY_H, opp.ducking, OPP_Y);
      drawLabel(opponentName, opp.score || 0, opp.speed || INIT_SPEED, OPP_Y);
      if (opp.status === 'dead' && !resultRef.current) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, OPP_Y, LW, LH);
        ctx.globalAlpha = 1.0; ctx.fillStyle = '#ff2d78'; ctx.font = "bold 24px Orbitron, sans-serif"; ctx.textAlign = 'center';
        ctx.fillText('OPPONENT DIED', LW / 2, OPP_Y + LH / 2); ctx.restore();
      }
    }

    // ── tick ───────────────────────────────────────────────────────────
    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }

      if (!resultRef.current) {
        update(dt, s);
        if (s.tick % 4 === 0) {
          socket.emit('infrun-state', {
            room,
            monkeyY: s.monkey.y,
            ducking: s.monkey.ducking,
            score: Math.floor(s.score),
            speed: s.speed,
            dist: s.dist,
            obstacles: s.obstacles.map(o => ({ type: o.type, x: o.x, w: o.w, h: o.h, yOff: o.yOff })),
          });
        }
        if (s.status === 'dead') {
          socket.emit('infrun-died', { room, score: Math.floor(s.score) });
          checkGameOver();
        }
      }

      draw(s);
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [socket, room, myName, opponentName, checkGameOver]); // eslint-disable-line

  // ── Play again ─────────────────────────────────────────────────────
  const handlePlayAgain = () => {
    myReadyRef.current = true;
    setMyReady(true);
    socket.emit('infrun-restart-ready', { room });
    if (oppReadyRef.current) doRestart();
  };

  // ── Result overlay ─────────────────────────────────────────────────
  const AC = '#00b4ff';
  const isWin = result === 'win';
  const isTie = result === 'tie';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <canvas 
          ref={canvasRef} 
          width={LW} 
          height={TOTAL_H} 
          style={{ 
            display: 'block', 
            border: '2px solid rgba(0,180,255,0.4)', 
            borderRadius: 4, 
            boxShadow: '0 0 32px rgba(0,100,255,0.28), inset 0 0 24px rgba(0,0,40,0.85)',
            width: LW * canvasScale,
            height: TOTAL_H * canvasScale,
            touchAction: 'none'
          }} 
        />
      </div>
      <HomeButton />

      {result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,0,16,0.82)', backdropFilter: 'blur(6px)', padding: 20 }}>
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, 
            padding: isMobile ? '30px 24px' : '44px 52px', 
            width: isMobile ? '90%' : 'auto',
            maxWidth: 400,
            background: 'rgba(4,0,20,0.92)', 
            border: `2px solid ${isWin ? '#00ff88' : result === 'opp-left' ? AC : '#ff2d78'}`, 
            borderRadius: 8, 
            boxShadow: `0 0 48px ${isWin ? '#00ff8844' : result === 'opp-left' ? '#00b4ff44' : '#ff2d7844'}` 
          }}>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 13, color: isTie ? '#ffe066' : isWin ? '#00ff88' : result === 'opp-left' ? AC : '#ff2d78', letterSpacing: '0.5em', textShadow: `0 0 16px currentColor` }}>
              {result === 'opp-left' ? 'OPPONENT LEFT' : isTie ? 'DRAW' : isWin ? 'VICTORY' : 'GAME OVER'}
            </div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: isMobile ? 32 : 48, color: '#fff', letterSpacing: '0.08em', textAlign: 'center', textShadow: `0 0 28px ${isTie ? '#ffe066' : isWin ? '#00ff88' : '#ff2d78'}` }}>
              {result === 'opp-left' ? 'WIN' : isTie ? 'TIE!' : isWin ? 'YOU WIN!' : 'YOU LOSE'}
            </div>
            {result !== 'opp-left' && (
              <div style={{ display: 'flex', gap: 40, marginTop: 4 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em' }}>YOUR SCORE</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 36, color: '#ffe066', textShadow: '0 0 12px #ffcc00' }}>{resultData.myScore.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em' }}>{opponentName.toUpperCase()}</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 36, color: '#00e5ff', textShadow: '0 0 12px #00e5ff' }}>{resultData.oppScore.toLocaleString()}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', marginTop: 8 }}>
              {!myReady ? (
                <button onClick={handlePlayAgain} style={{ width: '100%', padding: '14px 32px', background: 'transparent', border: `2px solid ${AC}`, borderRadius: 4, color: AC, fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer', boxShadow: `0 0 12px ${AC}44`, transition: 'all 0.16s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${AC}18`; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = AC; }}
                >PLAY AGAIN</button>
              ) : (
                <div style={{ fontFamily: "'VT323', monospace", fontSize: 22, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em' }}>WAITING FOR OPPONENT…</div>
              )}
              <div style={{ marginTop: 20 }}>
                <HomeButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineInfinityRunGame;
