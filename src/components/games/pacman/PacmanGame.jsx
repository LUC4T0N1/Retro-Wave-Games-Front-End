import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Leaderboard from '../../ui/Leaderboard';
import isMobile from '../../../utils/isMobile';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

const COLS = 21;
const ROWS = 22;

const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,0,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,4,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,0,0,0,0,0,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GHOST_COLORS = ['#ff2222', '#ffb8ff', '#00e5ff', '#ffb852'];
const EXIT_COL = 10;
const EXIT_ROW = 6;

function buildMaze() { return MAZE_TEMPLATE.map(r => [...r]); }
function countDots(maze) {
  let n = 0;
  maze.forEach(row => row.forEach(v => { if (v === 2 || v === 3) n++; }));
  return n;
}

function levelConfig(level) {
  const L = Math.min(level, 7);
  const delays = [
    [0, 6, 12, 18], [0, 5,  9, 15], [0, 4,  7, 12],
    [0, 3,  5,  9], [0, 2,  4,  7], [0, 1,  3,  5], [0, 0,  2,  3],
  ][L - 1];
  return {
    pacSpeed:         Math.max(0.11, 0.22 - (L - 1) * 0.016),
    ghostSpeed:       Math.max(0.15, 0.30 - (L - 1) * 0.023),
    frightenDuration: Math.max(3,    9    - (L - 1) * 0.9),
    releaseDelays: delays,
  };
}

function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function PacmanGame() {
  const canvasRef       = useRef(null);
  const stateRef        = useRef(null);
  const animRef         = useRef(null);
  const lastTRef        = useRef(0);
  const lbVisibleRef    = useRef(false);
  const sessionTokenRef = useRef(null);

  const [ui, setUi]           = useState({ score: 0, lives: 3, level: 1, status: 'playing' });
  const [lbVisible, setLbVisible] = useState(false);

  const CELL = isMobile
    ? Math.floor(Math.min(window.innerWidth * 0.95, 360) / COLS)
    : 28;
  const CW = CELL * COLS;
  const CH = CELL * ROWS;

  const initState = useCallback((level = 1, score = 0, lives = 3) => {
    const cfg  = levelConfig(level);
    const maze = buildMaze();
    return {
      maze,
      totalDots: countDots(maze),
      dotsLeft:  countDots(maze),
      score, lives, level,
      status: 'playing',
      levelCompleteTimer: 0,
      pacman: {
        x: 10, y: 16, prevX: 10, prevY: 16,
        dx: 0, dy: 0, nextDx: 0, nextDy: 0,
        animT: 0, moveAccum: 0,
      },
      ghosts: GHOST_COLORS.map((color, i) => {
        const sx = i === 0 ? EXIT_COL : (9 + (i - 1));
        const sy = i === 0 ? EXIT_ROW : 9;
        return {
          color, x: sx, y: sy, prevX: sx, prevY: sy,
          dx: 0, dy: 0,
          mode: i === 0 ? 'chase' : 'house',
          releaseTimer: cfg.releaseDelays[i],
          frightTimer: 0,
          moveAccum: 0, lastMoveSpeed: cfg.ghostSpeed,
          bounceDir: 1, bounceAccum: 0,
          homeX: sx, homeY: sy,
        };
      }),
      pacSpeed:         cfg.pacSpeed,
      ghostSpeed:       cfg.ghostSpeed,
      frightenDuration: cfg.frightenDuration,
      ghostEatCombo: 0,
      deathAnim: 0,
      deathAnimating: false,
    };
  }, []);

  const requestSession = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/leaderboard/pacman/session`, {
        method: 'POST',
      });
      const json = await res.json();
      sessionTokenRef.current = json.sessionToken || null;
    } catch {
      sessionTokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    stateRef.current = initState(1);
    setUi({ score: 0, lives: 3, level: 1, status: 'playing' });
    requestSession();
  }, [initState, requestSession]);

  // Show leaderboard when game over
  useEffect(() => {
    if (ui.status === 'dead') {
      lbVisibleRef.current = true;
      setLbVisible(true);
    }
  }, [ui.status]);

  const restart = useCallback(() => {
    stateRef.current = initState(1);
    setUi({ score: 0, lives: 3, level: 1, status: 'playing' });
    requestSession();
  }, [initState, requestSession]);

  const nextLevel = useCallback((score, lives, level) => {
    const lvl = level + 1;
    stateRef.current = initState(lvl, score, lives);
    setUi({ score, lives, level: lvl, status: 'playing' });
  }, [initState]);

  const handlePlayAgain = () => {
    lbVisibleRef.current = false;
    setLbVisible(false);
    restart();
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (s.status === 'dead') {
        if (!lbVisibleRef.current && (e.key === 'Enter' || e.key === ' ')) restart();
        return;
      }
      if (s.status === 'levelComplete') return;
      const MAP = {
        ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
        w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
      };
      const d = MAP[e.key];
      if (d) { s.pacman.nextDx = d[0]; s.pacman.nextDy = d[1]; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restart]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let tx = 0, ty = 0;
    const onStart = (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onEnd   = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (s.status === 'dead') { if (!lbVisibleRef.current) restart(); return; }
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) { s.pacman.nextDx = dx > 0 ? 1 : -1; s.pacman.nextDy = 0; }
      else                             { s.pacman.nextDy = dy > 0 ? 1 : -1; s.pacman.nextDx = 0; }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend',   onEnd);
    };
  }, [restart]);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function wrapX(x) { return ((x % COLS) + COLS) % COLS; }
    function canMove(maze, x, y, dx, dy, allowDoor = false) {
      const ny = y + dy, wnx = wrapX(x + dx);
      if (ny < 0 || ny >= ROWS) return false;
      const cell = maze[ny][wnx];
      if (cell === 1) return false;
      if (cell === 4 && !allowDoor) return false;
      return true;
    }

    // ── Ghost AI ────────────────────────────────────────────────────────────
    function ghostAI(g, pm, maze, dt, s) {
      if (g.mode === 'house') {
        g.releaseTimer -= dt;
        if (g.releaseTimer <= 0) { g.mode = 'exiting'; g.moveAccum = 0; return; }
        g.bounceAccum += dt;
        if (g.bounceAccum >= 0.35) {
          g.bounceAccum = 0;
          const nx = g.x + g.bounceDir;
          g.prevX = g.x;
          if (nx < 8 || nx > 12 || maze[g.y][nx] === 1) { g.bounceDir = -g.bounceDir; }
          else { g.x = nx; }
        }
        return;
      }

      if (g.mode === 'exiting') {
        g.moveAccum += dt;
        if (g.moveAccum < s.ghostSpeed) return;
        g.lastMoveSpeed = s.ghostSpeed;
        g.prevX = g.x; g.prevY = g.y;
        g.moveAccum = 0;
        if (g.y > EXIT_ROW) {
          if (g.x !== EXIT_COL) {
            const dx = g.x < EXIT_COL ? 1 : -1;
            if (canMove(maze, g.x, g.y, dx, 0, true)) g.x += dx;
            else if (canMove(maze, g.x, g.y, 0, -1, true)) g.y--;
          } else {
            if (canMove(maze, g.x, g.y, 0, -1, true)) g.y--;
          }
        } else {
          g.mode = 'chase'; g.dx = 1; g.dy = 0;
        }
        return;
      }

      const OPP = { '1,0':'-1,0', '-1,0':'1,0', '0,1':'0,-1', '0,-1':'0,1' };
      const ALL = [[1,0],[-1,0],[0,1],[0,-1]];

      if (g.mode === 'frightened') {
        g.frightTimer -= dt;
        if (g.frightTimer <= 0) { g.mode = 'chase'; return; }
        const speed = s.ghostSpeed * 1.8;
        g.moveAccum += dt;
        if (g.moveAccum < speed) return;
        g.lastMoveSpeed = speed;
        g.prevX = g.x; g.prevY = g.y;
        g.moveAccum = 0;
        const curKey = `${g.dx},${g.dy}`;
        let valid = ALL.filter(([dx,dy]) =>
          `${dx},${dy}` !== OPP[curKey] && canMove(maze, g.x, g.y, dx, dy));
        if (!valid.length) valid = ALL.filter(([dx,dy]) => canMove(maze, g.x, g.y, dx, dy));
        if (!valid.length) return;
        const pick = valid[Math.floor(Math.random() * valid.length)];
        g.dx = pick[0]; g.dy = pick[1];
        g.x = wrapX(g.x + g.dx);
        g.y = Math.max(0, Math.min(ROWS - 1, g.y + g.dy));
        return;
      }

      // chase
      g.moveAccum += dt;
      if (g.moveAccum < s.ghostSpeed) return;
      g.lastMoveSpeed = s.ghostSpeed;
      g.prevX = g.x; g.prevY = g.y;
      g.moveAccum = 0;
      const curKey = `${g.dx},${g.dy}`;
      let valid = ALL.filter(([dx,dy]) =>
        `${dx},${dy}` !== OPP[curKey] && canMove(maze, g.x, g.y, dx, dy));
      if (!valid.length) valid = ALL.filter(([dx,dy]) => canMove(maze, g.x, g.y, dx, dy));
      if (!valid.length) return;
      const tx = pm.x, ty = pm.y;
      const best = valid.reduce((b, d) => {
        const dist  = (wrapX(g.x + d[0]) - tx) ** 2 + (g.y + d[1] - ty) ** 2;
        const bdist = (wrapX(g.x + b[0]) - tx) ** 2 + (g.y + b[1] - ty) ** 2;
        return dist < bdist ? d : b;
      });
      g.dx = best[0]; g.dy = best[1];
      g.x = wrapX(g.x + g.dx);
      g.y = Math.max(0, Math.min(ROWS - 1, g.y + g.dy));
    }

    // ── Draw ────────────────────────────────────────────────────────────────
    function draw(s, ts) {
      const C = CELL;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#04000e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      s.maze.forEach((row, ry) => {
        row.forEach((cell, cx) => {
          const px = cx * C, py = ry * C;
          if (cell === 1) {
            ctx.fillStyle = '#080038';
            ctx.fillRect(px, py, C, C);
            ctx.strokeStyle = '#0055dd';
            ctx.shadowColor = '#0088ff'; ctx.shadowBlur = 5;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 0.75, py + 0.75, C - 1.5, C - 1.5);
            ctx.shadowBlur = 0;
          } else if (cell === 2) {
            ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(px + C/2, py + C/2, C * 0.10, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
          } else if (cell === 3) {
            const p = 0.65 + 0.35 * Math.sin(ts * 0.005);
            ctx.fillStyle = `rgba(255,170,0,${p})`; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(px + C/2, py + C/2, C * 0.27, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
          } else if (cell === 4) {
            ctx.fillStyle = '#ff66bb';
            ctx.fillRect(px, py + C*0.4, C, C*0.2);
          }
        });
      });

      // Ghosts (interpolated)
      s.ghosts.forEach(g => {
        const doLerp = g.mode !== 'house';
        const t_g = doLerp && g.lastMoveSpeed > 0 ? g.moveAccum / g.lastMoveSpeed : 1;
        const noWrapX = Math.abs(g.x - g.prevX) <= 1;
        const rgx = doLerp && noWrapX ? lp(g.prevX, g.x, t_g) : g.x;
        const rgy = doLerp ? lp(g.prevY, g.y, t_g) : g.y;
        const px  = rgx * C + C/2;
        const py  = rgy * C + C/2;
        const r   = C * 0.42;
        const frightBlink = g.mode === 'frightened' && g.frightTimer < 2 && Math.sin(ts * 0.018) > 0;
        const col = g.mode === 'frightened' ? (frightBlink ? '#fff' : '#2244ff') : g.color;

        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py - r*0.1, r, Math.PI, 0);
        ctx.lineTo(px + r, py + r*0.88);
        for (let i = 0; i < 3; i++) {
          const bx = px + r - (r*2/3)*i;
          ctx.quadraticCurveTo(bx - r/3, py + r*1.28, bx - r*2/3, py + r*0.88);
        }
        ctx.lineTo(px - r, py - r*0.1);
        ctx.closePath(); ctx.fill();

        ctx.shadowBlur = 0;
        if (g.mode !== 'frightened') {
          const edx = (g.mode === 'chase' ? g.dx : 0) * r * 0.09;
          const edy = (g.mode === 'chase' ? g.dy : 0) * r * 0.09;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(px-r*0.28, py-r*0.08, r*0.17, r*0.23, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(px+r*0.28, py-r*0.08, r*0.17, r*0.23, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000d';
          ctx.beginPath(); ctx.arc(px-r*0.28+edx, py-r*0.08+edy, r*0.10, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px+r*0.28+edx, py-r*0.08+edy, r*0.10, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(px-r*0.30, py, r*0.10, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px+r*0.30, py, r*0.10, 0, Math.PI*2); ctx.fill();
        }
      });

      // Pacman (interpolated)
      const pm   = s.pacman;
      const t_pm = s.pacSpeed > 0 ? pm.moveAccum / s.pacSpeed : 1;
      const noWrapPm = Math.abs(pm.x - pm.prevX) <= 1;
      const rpx  = noWrapPm ? lp(pm.prevX, pm.x, t_pm) : pm.x;
      const rpy  = lp(pm.prevY, pm.y, t_pm);
      const ppx  = rpx * C + C/2;
      const ppy  = rpy * C + C/2;
      const pr   = C * 0.44;

      const isMoving = pm.dx !== 0 || pm.dy !== 0;
      const mouthOpen = s.deathAnimating
        ? s.deathAnim * Math.PI
        : isMoving
          ? 0.25 * Math.abs(Math.sin(t_pm * Math.PI))
          : 0.12;
      const angle = Math.atan2(pm.dy, pm.dx === 0 && pm.dy === 0 ? 1 : (pm.dx || 1));

      ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14;
      ctx.beginPath();
      if (s.deathAnimating) {
        ctx.arc(ppx, ppy, pr, angle + mouthOpen, angle + Math.PI*2 - mouthOpen);
        ctx.lineTo(ppx, ppy);
      } else {
        ctx.moveTo(ppx, ppy);
        ctx.arc(ppx, ppy, pr, angle + mouthOpen, angle + Math.PI*2 - mouthOpen);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;

      // Level complete overlay only (game over handled by React modal)
      if (s.status === 'levelComplete') {
        ctx.fillStyle = 'rgba(0,0,12,0.65)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign  = 'center';
        ctx.fillStyle  = '#00ffcc';
        ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 22;
        ctx.font = `bold ${Math.round(C*1.3)}px Orbitron, sans-serif`;
        ctx.fillText(`LEVEL ${s.level} CLEAR!`, canvas.width/2, canvas.height/2 - C);
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${Math.round(C*0.65)}px Orbitron, sans-serif`;
        ctx.fillText('NEXT LEVEL INCOMING...', canvas.width/2, canvas.height/2 + C*0.7);
      }
    }

    // ── Tick ────────────────────────────────────────────────────────────────
    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(tick); return; }

      if (s.status === 'levelComplete') {
        s.levelCompleteTimer += dt;
        if (s.levelCompleteTimer >= 2.5) nextLevel(s.score, s.lives, s.level);
        draw(s, ts);
        animRef.current = requestAnimationFrame(tick); return;
      }
      if (s.status === 'dead') {
        draw(s, ts);
        animRef.current = requestAnimationFrame(tick); return;
      }

      if (s.deathAnimating) {
        s.deathAnim += dt * 1.8;
        if (s.deathAnim >= 1) {
          s.deathAnimating = false; s.deathAnim = 0;
          if (s.lives <= 0) { s.status = 'dead'; setUi(u => ({...u, status:'dead'})); }
          else resetPositions(s);
        }
        draw(s, ts);
        animRef.current = requestAnimationFrame(tick); return;
      }

      // Pacman move
      const pm = s.pacman;
      pm.animT += dt;

      if (pm.nextDx === -pm.dx && pm.nextDy === -pm.dy && (pm.dx !== 0 || pm.dy !== 0)) {
        pm.dx = pm.nextDx; pm.dy = pm.nextDy;
        const tempX = pm.x, tempY = pm.y;
        pm.x = pm.prevX; pm.y = pm.prevY;
        pm.prevX = tempX; pm.prevY = tempY;
        pm.moveAccum = Math.max(0, s.pacSpeed - pm.moveAccum);
      }

      if (pm.prevX === pm.x && pm.prevY === pm.y) {
        if (canMove(s.maze, pm.x, pm.y, pm.nextDx, pm.nextDy)) {
          pm.moveAccum = s.pacSpeed;
        }
      }

      pm.moveAccum += dt;
      if (pm.moveAccum >= s.pacSpeed) {
        pm.prevX = pm.x; pm.prevY = pm.y;
        pm.moveAccum = 0;
        if (canMove(s.maze, pm.x, pm.y, pm.nextDx, pm.nextDy)) {
          pm.dx = pm.nextDx; pm.dy = pm.nextDy;
        }
        if (canMove(s.maze, pm.x, pm.y, pm.dx, pm.dy)) {
          pm.x = wrapX(pm.x + pm.dx);
          pm.y = Math.max(0, Math.min(ROWS - 1, pm.y + pm.dy));
        }
        const cell = s.maze[pm.y][pm.x];
        if (cell === 2) { s.maze[pm.y][pm.x] = 0; s.score += 10; s.dotsLeft--; }
        else if (cell === 3) {
          s.maze[pm.y][pm.x] = 0; s.score += 50; s.dotsLeft--;
          s.ghostEatCombo = 0;
          s.ghosts.forEach(g => {
            if (g.mode === 'chase') { g.mode = 'frightened'; g.frightTimer = s.frightenDuration; }
          });
        }
        if (s.dotsLeft <= 0) {
          s.status = 'levelComplete'; s.levelCompleteTimer = 0;
          setUi(u => ({...u, status:'levelComplete', score:s.score}));
        }
      }

      // Ghosts
      s.ghosts.forEach(g => ghostAI(g, pm, s.maze, dt, s));

      // Collision
      let died = false;
      s.ghosts.forEach(g => {
        if (g.mode === 'house' || g.mode === 'exiting') return;
        if (Math.abs(g.x - pm.x) < 1 && Math.abs(g.y - pm.y) < 1) {
          if (g.mode === 'frightened') {
            g.mode = 'house'; g.x = g.homeX; g.y = g.homeY; g.prevX = g.homeX; g.prevY = g.homeY;
            g.dx = 0; g.dy = 0; g.releaseTimer = 3; g.moveAccum = 0; g.bounceAccum = 0; g.bounceDir = 1;
            s.ghostEatCombo++;
            s.score += 200 * Math.pow(2, s.ghostEatCombo - 1);
          } else if (!died) {
            died = true; s.lives--;
            s.deathAnimating = true;
            setUi(u => ({...u, lives:s.lives, score:s.score}));
          }
        }
      });

      setUi(u => ({...u, score:s.score}));
      draw(s, ts);
      animRef.current = requestAnimationFrame(tick);
    }

    lastTRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [CELL, nextLevel]);

  function resetPositions(s) {
    const pm = s.pacman;
    pm.x = 10; pm.y = 16; pm.prevX = 10; pm.prevY = 16;
    pm.dx = 0; pm.dy = 0; pm.nextDx = 0; pm.nextDy = 0; pm.moveAccum = 0;
    const cfg = levelConfig(s.level);
    s.ghosts.forEach((g, i) => {
      g.x = g.homeX; g.y = g.homeY; g.prevX = g.homeX; g.prevY = g.homeY;
      g.dx = 0; g.dy = 0;
      g.mode = i === 0 ? 'chase' : 'house';
      g.releaseTimer = cfg.releaseDelays[i];
      g.frightTimer = 0; g.moveAccum = 0; g.lastMoveSpeed = cfg.ghostSpeed;
      g.bounceAccum = 0; g.bounceDir = 1;
    });
    s.ghostEatCombo = 0;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      {/* scanlines overlay (optional as RetroGrid has them, but keeping for consistency if needed or removing if redundant) */}
      {/* Removing redundant overlays and scanlines as RetroGrid handles it */}
      <HomeButton />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: CW, fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13,
          color: '#fff', letterSpacing: '0.08em', padding: '0 4px', boxSizing: 'border-box',
        }}>
          <div>
            <span style={{ color: '#ffe066', textShadow: '0 0 10px #ffcc00' }}>SCORE </span>
            <span>{ui.score}</span>
          </div>
          <div style={{ color: '#cc00ff', textShadow: '0 0 10px #cc00ff' }}>LVL {ui.level}</div>
          <div style={{ color: '#ff2d78', textShadow: '0 0 8px #ff2d78' }}>
            {'♥'.repeat(Math.max(0, ui.lives))}
          </div>
        </div>

        <div style={{
          border: '2px solid rgba(0,180,255,0.4)', borderRadius: 4,
          boxShadow: '0 0 32px rgba(0,100,255,0.28), inset 0 0 24px rgba(0,0,40,0.85)',
          overflow: 'hidden',
        }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} />
        </div>

        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 14, color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          {isMobile ? 'SWIPE TO MOVE' : 'WASD / ARROW KEYS'}
        </div>
      </div>

      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/pacman`}
        score={ui.score}
        sessionToken={sessionTokenRef.current}
        onPlayAgain={handlePlayAgain}
        visible={lbVisible}
      />
    </div>
  );
}

export default PacmanGame;
