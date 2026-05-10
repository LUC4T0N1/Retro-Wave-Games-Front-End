import { useEffect, useRef, useCallback } from 'react';
import Leaderboard from '../../../components/shared/Leaderboard';
import ControlsLegend from '../../../components/shared/ControlsLegend';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import isMobile from '../../../utils/isMobile';
import PacmanMobileControls from './PacmanMobileControls';
import { usePacman } from '../../../controllers/pacman/usePacman';
import { 
  COLS, ROWS, EXIT_COL, EXIT_ROW, 
  wrapX, canMove, lp, levelConfig, saveBest 
} from '../../../models/pacman/pacmanModel';

export default function PacmanGame() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTRef = useRef(0);
  const { 
    stateRef, ui, setUi, lbVisible, setLbVisible, 
    sessionToken, restart, initState, changeDirection 
  } = usePacman();

  const CELL = isMobile ? Math.floor(Math.min(window.innerWidth * 0.95, 360) / COLS) : 28;
  const CW = CELL * COLS, CH = CELL * ROWS;

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    if (ui.status === 'dead') {
      setLbVisible(true);
    }
  }, [ui.status, setLbVisible]);

  useEffect(() => {
    const onKey = (e) => {
      if (ui.status === 'dead' && !lbVisible && (e.key === 'Enter' || e.key === ' ')) restart();
      else changeDirection(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDirection, ui.status, lbVisible, restart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function ghostAI(g, pm, maze, dt, s) {
      if (g.mode === 'house') {
        g.releaseTimer -= dt;
        if (g.releaseTimer <= 0) { g.mode = 'exiting'; g.moveAccum = 0; return; }
        g.bounceAccum += dt;
        if (g.bounceAccum >= 0.35) {
          g.bounceAccum = 0;
          const nx = g.x + g.bounceDir; g.prevX = g.x;
          if (nx < 8 || nx > 12 || maze[g.y][nx] === 1) g.bounceDir = -g.bounceDir; else g.x = nx;
        }
        return;
      }
      if (g.mode === 'exiting') {
        g.moveAccum += dt;
        if (g.moveAccum < s.ghostSpeed) return;
        g.lastMoveSpeed = s.ghostSpeed; g.prevX = g.x; g.prevY = g.y; g.moveAccum = 0;
        if (g.y > EXIT_ROW) {
          if (g.x !== EXIT_COL) {
            const dx = g.x < EXIT_COL ? 1 : -1;
            if (canMove(maze, g.x, g.y, dx, 0, true)) g.x += dx; else if (canMove(maze, g.x, g.y, 0, -1, true)) g.y--;
          } else if (canMove(maze, g.x, g.y, 0, -1, true)) g.y--;
        } else { g.mode = 'chase'; g.dx = 1; g.dy = 0; }
        return;
      }
      const ALL = [[1,0],[-1,0],[0,1],[0,-1]], OPP = { '1,0':'-1,0', '-1,0':'1,0', '0,1':'0,-1', '0,-1':'0,1' };
      if (g.mode === 'frightened') {
        g.frightTimer -= dt; if (g.frightTimer <= 0) { g.mode = 'chase'; return; }
        const speed = s.ghostSpeed * 1.8; g.moveAccum += dt;
        if (g.moveAccum < speed) return;
        g.lastMoveSpeed = speed; g.prevX = g.x; g.prevY = g.y; g.moveAccum = 0;
        const valid = ALL.filter(([dx,dy]) => `${dx},${dy}` !== OPP[`${g.dx},${g.dy}`] && canMove(maze, g.x, g.y, dx, dy));
        const pick = valid.length ? valid[Math.floor(Math.random() * valid.length)] : ALL.find(([dx,dy]) => canMove(maze, g.x, g.y, dx, dy));
        if (pick) { g.dx = pick[0]; g.dy = pick[1]; g.x = wrapX(g.x + g.dx); g.y = Math.max(0, Math.min(ROWS - 1, g.y + g.dy)); }
        return;
      }
      g.moveAccum += dt; if (g.moveAccum < s.ghostSpeed) return;
      g.lastMoveSpeed = s.ghostSpeed; g.prevX = g.x; g.prevY = g.y; g.moveAccum = 0;
      const valid = ALL.filter(([dx, dy]) => `${dx},${dy}` !== OPP[`${g.dx},${g.dy}`] && canMove(maze, g.x, g.y, dx, dy));
      const candidates = valid.length ? valid : ALL.filter(([dx, dy]) => canMove(maze, g.x, g.y, dx, dy));
      if (!candidates.length) return;

      const scored = candidates.map(d => {
        const nx = wrapX(g.x + d[0]), ny = g.y + d[1];
        let dx = Math.abs(nx - pm.x), dy = Math.abs(ny - pm.y);
        if (dx > COLS / 2) dx = COLS - dx;
        return { d, dist: dx * dx + dy * dy };
      });
      const minDist = Math.min(...scored.map(s => s.dist));
      const bestOnes = scored.filter(s => s.dist === minDist).map(s => s.d);
      const best = bestOnes[Math.floor(Math.random() * bestOnes.length)];

      g.dx = best[0]; g.dy = best[1]; g.x = wrapX(g.x + g.dx); g.y = Math.max(0, Math.min(ROWS - 1, g.y + g.dy));
    }

    function draw(s, ts) {
      const C = CELL; ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#04000e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      s.maze.forEach((row, ry) => row.forEach((cell, cx) => {
        const px = cx * C, py = ry * C;
        if (cell === 1) { ctx.fillStyle = '#080038'; ctx.fillRect(px, py, C, C); ctx.strokeStyle = '#0055dd'; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.75, py + 0.75, C - 1.5, C - 1.5); }
        else if (cell === 2) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(px + C/2, py + C/2, C * 0.10, 0, Math.PI*2); ctx.fill(); }
        else if (cell === 3) { const p = 0.65 + 0.35 * Math.sin(ts * 0.005); ctx.fillStyle = `rgba(255,170,0,${p})`; ctx.beginPath(); ctx.arc(px + C/2, py + C/2, C * 0.27, 0, Math.PI*2); ctx.fill(); }
        else if (cell === 4) { ctx.fillStyle = '#ff66bb'; ctx.fillRect(px, py + C*0.4, C, C*0.2); }
      }));
      s.ghosts.forEach(g => {
        const t_g = g.mode !== 'house' && g.lastMoveSpeed > 0 ? g.moveAccum / g.lastMoveSpeed : 1;
        const px = (Math.abs(g.x - g.prevX) <= 1 ? lp(g.prevX, g.x, t_g) : g.x) * C + C/2, py = lp(g.prevY, g.y, t_g) * C + C/2, r = C * 0.42;
        const fb = g.mode === 'frightened' && g.frightTimer < 2 && Math.sin(ts * 0.018) > 0;
        ctx.fillStyle = g.mode === 'frightened' ? (fb ? '#fff' : '#2244ff') : g.color;
        ctx.beginPath(); ctx.arc(px, py - r*0.1, r, Math.PI, 0); ctx.lineTo(px + r, py + r*0.88);
        for (let i = 0; i < 3; i++) ctx.quadraticCurveTo(px + r - (r*2/3)*i - r/3, py + r*1.28, px + r - (r*2/3)*(i+1), py + r*0.88);
        ctx.lineTo(px - r, py - r*0.1); ctx.closePath(); ctx.fill();
        if (g.mode !== 'frightened') {
          const edx = (g.mode === 'chase' ? g.dx : 0) * r * 0.09, edy = (g.mode === 'chase' ? g.dy : 0) * r * 0.09;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(px-r*0.28, py-r*0.08, r*0.17, r*0.23, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(px+r*0.28, py-r*0.08, r*0.17, r*0.23, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000d'; ctx.beginPath(); ctx.arc(px-r*0.28+edx, py-r*0.08+edy, r*0.10, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+r*0.28+edx, py-r*0.08+edy, r*0.10, 0, Math.PI*2); ctx.fill();
        } else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px-r*0.30, py, r*0.10, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+r*0.30, py, r*0.10, 0, Math.PI*2); ctx.fill(); }
      });
      const pm = s.pacman, t_pm = s.pacSpeed > 0 ? pm.moveAccum / s.pacSpeed : 1, ppx = (Math.abs(pm.x - pm.prevX) <= 1 ? lp(pm.prevX, pm.x, t_pm) : pm.x) * C + C/2, ppy = lp(pm.prevY, pm.y, t_pm) * C + C/2, pr = C * 0.44;
      const mo = s.deathAnimating ? s.deathAnim * Math.PI : (pm.dx !== 0 || pm.dy !== 0 ? 0.25 * Math.abs(Math.sin(t_pm * Math.PI)) : 0.12), angle = Math.atan2(pm.dy, pm.dx || 1);
      ctx.fillStyle = '#ffee00'; ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.arc(ppx, ppy, pr, angle + mo, angle + Math.PI*2 - mo); ctx.closePath(); ctx.fill();
      if (s.status === 'levelComplete') { ctx.fillStyle = 'rgba(0,0,12,0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.fillStyle = '#00ffcc'; ctx.font = `bold ${Math.round(C*1.3)}px Orbitron, sans-serif`; ctx.fillText(`LEVEL ${s.level} CLEAR!`, canvas.width/2, canvas.height/2 - C); }
    }

    function resetPositions(s) {
      const pm = s.pacman; pm.x = 10; pm.y = 16; pm.prevX = 10; pm.prevY = 16; pm.dx = 0; pm.dy = 0; pm.nextDx = 0; pm.nextDy = 0; pm.moveAccum = 0;
      const cfg = levelConfig(s.level);
      s.ghosts.forEach((g, i) => { g.x = g.homeX; g.y = g.homeY; g.prevX = g.homeX; g.prevY = g.homeY; g.dx = 0; g.dy = 0; g.mode = i === 0 ? 'chase' : 'house'; g.releaseTimer = cfg.releaseDelays[i]; g.frightTimer = 0; g.moveAccum = 0; g.lastMoveSpeed = cfg.ghostSpeed; g.bounceAccum = 0; g.bounceDir = 1; });
      s.ghostEatCombo = 0;
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTRef.current) / 1000); lastTRef.current = ts;
      const s = stateRef.current; if (!s) { animRef.current = requestAnimationFrame(tick); return; }
      if (s.status === 'levelComplete') { s.levelCompleteTimer += dt; if (s.levelCompleteTimer >= 2.5) { const lvl = s.level + 1; stateRef.current = initState(lvl, s.score, s.lives); setUi(u => ({ ...u, level: lvl, status: 'playing' })); } draw(s, ts); animRef.current = requestAnimationFrame(tick); return; }
      if (s.status === 'dead') {
        saveBest(s.score);
        draw(s, ts); animRef.current = requestAnimationFrame(tick); return;
      }
      if (s.deathAnimating) { s.deathAnim += dt * 1.8; if (s.deathAnim >= 1) { s.deathAnimating = false; s.deathAnim = 0; if (s.lives <= 0) { s.status = 'dead'; setUi(u => ({ ...u, status: 'dead' })); } else resetPositions(s); } draw(s, ts); animRef.current = requestAnimationFrame(tick); return; }
      const pm = s.pacman; pm.animT += dt;
      if (pm.nextDx === -pm.dx && pm.nextDy === -pm.dy && (pm.dx !== 0 || pm.dy !== 0)) { pm.dx = pm.nextDx; pm.dy = pm.nextDy; const tx = pm.x, ty = pm.y; pm.x = pm.prevX; pm.y = pm.prevY; pm.prevX = tx; pm.prevY = ty; pm.moveAccum = Math.max(0, s.pacSpeed - pm.moveAccum); }
      if (pm.prevX === pm.x && pm.prevY === pm.y && canMove(s.maze, pm.x, pm.y, pm.nextDx, pm.nextDy)) pm.moveAccum = s.pacSpeed;
      pm.moveAccum += dt;
      if (pm.moveAccum >= s.pacSpeed) { pm.prevX = pm.x; pm.prevY = pm.y; pm.moveAccum = 0; if (canMove(s.maze, pm.x, pm.y, pm.nextDx, pm.nextDy)) { pm.dx = pm.nextDx; pm.dy = pm.nextDy; } if (canMove(s.maze, pm.x, pm.y, pm.dx, pm.dy)) { pm.x = wrapX(pm.x + pm.dx); pm.y = Math.max(0, Math.min(ROWS - 1, pm.y + pm.dy)); } const cell = s.maze[pm.y][pm.x]; if (cell === 2) { s.maze[pm.y][pm.x] = 0; s.score += 10; s.dotsLeft--; } else if (cell === 3) { s.maze[pm.y][pm.x] = 0; s.score += 50; s.dotsLeft--; s.ghostEatCombo = 0; s.ghosts.forEach(g => { if (g.mode === 'chase') { g.mode = 'frightened'; g.frightTimer = s.frightenDuration; } }); } if (s.dotsLeft <= 0) { s.status = 'levelComplete'; s.levelCompleteTimer = 0; setUi(u => ({ ...u, status: 'levelComplete', score: s.score })); } }
      s.ghosts.forEach(g => ghostAI(g, pm, s.maze, dt, s));
      let died = false; s.ghosts.forEach(g => { if (g.mode !== 'house' && g.mode !== 'exiting' && Math.abs(g.x - pm.x) < 1 && Math.abs(g.y - pm.y) < 1) { if (g.mode === 'frightened') { g.mode = 'house'; g.x = g.homeX; g.y = g.homeY; g.prevX = g.homeX; g.prevY = g.homeY; g.dx = 0; g.dy = 0; g.releaseTimer = 3; g.moveAccum = 0; g.bounceAccum = 0; g.bounceDir = 1; s.ghostEatCombo++; s.score += 200 * Math.pow(2, s.ghostEatCombo - 1); } else if (!died) { died = true; s.lives--; s.deathAnimating = true; setUi(u => ({ ...u, lives: s.lives, score: s.score })); } } });
      setUi(u => ({ ...u, score: s.score })); draw(s, ts); animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [CELL, initState, setUi]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <HomeButton />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: CW, fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13, color: '#fff', letterSpacing: '0.08em', padding: '0 4px', boxSizing: 'border-box' }}>
          <div><span style={{ color: '#ffe066', textShadow: '0 0 10px #ffcc00' }}>SCORE </span><span>{ui.score}</span></div>
          <div style={{ color: '#cc00ff', textShadow: '0 0 10px #cc00ff' }}>LVL {ui.level}</div>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <div style={{ color: '#00ffcc', textShadow: '0 0 8px #00ffcc' }}>BEST {ui.best}</div>
            <div style={{ color: '#ff2d78', textShadow: '0 0 8px #ff2d78' }}>{'♥'.repeat(Math.max(0, ui.lives))}</div>
          </div>
        </div>
        <div style={{ border: '2px solid rgba(0,180,255,0.4)', borderRadius: 4, boxShadow: '0 0 32px rgba(0,100,255,0.28), inset 0 0 24px rgba(0,0,40,0.85)', overflow: 'hidden' }}><canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} /></div>
        {isMobile && <div style={{ marginTop: 20 }}><PacmanMobileControls onDirectionChange={changeDirection} /></div>}
      </div>
      <Leaderboard apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/pacman`} score={ui.score} sessionToken={sessionToken} onPlayAgain={restart} visible={lbVisible} />
      <ControlsLegend controls={[
        ['WASD / ↑↓←→', 'move'],
      ]} />
    </div>
  );
}
