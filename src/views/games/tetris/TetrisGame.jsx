import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Leaderboard from '../../../components/shared/Leaderboard';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';
import isMobile from '../../../utils/isMobile';
import TetrisMobileControls from './TetrisMobileControls';
import DesktopControls from './DesktopControls';
import { useTetris } from '../../../controllers/tetris/useTetris';
import { 
  COLORS, PIECES, ROWS, COLS, LEVEL_SPEED, 
  rotate, fits, ghostY 
} from '../../../models/tetris/tetrisModel';

export default function TetrisGame() {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const { 
    stateRef, score, lbVisible, sessionToken, 
    initState, handleAction, lockAndNext, lastDropRef 
  } = useTetris();

  const lbVisibleRef = useRef(false);
  useEffect(() => { lbVisibleRef.current = lbVisible; }, [lbVisible]);

  const drawBlock = useCallback((ctx, px, py, color, cs, alpha = 1, ghost = false) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
    } else {
      const grd = ctx.createLinearGradient(px, py, px + cs, py + cs);
      grd.addColorStop(0, color + 'ff');
      grd.addColorStop(1, color + '99');
      ctx.fillStyle = grd;
      ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
    }
    ctx.restore();
  }, []);

  const drawMini = useCallback((ctx, shape, color, areaX, areaY, areaW, areaH, miniCs) => {
    const rows = shape.length, cols = shape[0].length;
    const pieceW = cols * miniCs, pieceH = rows * miniCs;
    const ox = areaX + (areaW - pieceW) / 2;
    const oy = areaY + (areaH - pieceH) / 2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (shape[r][c]) drawBlock(ctx, ox + c * miniCs, oy + r * miniCs, COLORS[color], miniCs);
  }, [drawBlock]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const s = stateRef.current;
    if (!s) return;

    let cs = Math.floor(H / (ROWS + 2));
    if (cs * 22 > W) cs = Math.floor(W / 22);
    const boardW = cs * COLS;
    const panelW = cs * 5;
    const totalW = boardW + panelW * 2;
    const bx = (W - totalW) / 2 + panelW;
    const by = (H - cs * ROWS) / 2;

    ctx.clearRect(0, 0, W, H);

    // Board BG
    ctx.fillStyle = 'rgba(4,0,18,0.85)';
    ctx.fillRect(bx, by, boardW, cs * ROWS);
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.strokeRect(bx, by, boardW, cs * ROWS);

    // Grid
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#00e5ff';
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(bx, by + r * cs); ctx.lineTo(bx + boardW, by + r * cs); ctx.stroke();
    }
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(bx + c * cs, by); ctx.lineTo(bx + c * cs, by + cs * ROWS); ctx.stroke();
    }
    ctx.restore();

    // Board pieces
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (s.board[r][c]) drawBlock(ctx, bx + c * cs, by + r * cs, COLORS[s.board[r][c]], cs);

    // Current & Ghost
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, boardW, cs * ROWS);
    ctx.clip();

    if (s.status === 'playing' && s.current) {
      const gy = ghostY(s.board, s.current.shape, s.current.x, s.current.y);
      if (gy !== s.current.y) {
        for (let r = 0; r < s.current.shape.length; r++)
          for (let c = 0; c < s.current.shape[r].length; c++)
            if (s.current.shape[r][c])
              drawBlock(ctx, bx + (s.current.x + c) * cs, by + (gy + r) * cs, COLORS[s.current.color], cs, 0.35, true);
      }
      for (let r = 0; r < s.current.shape.length; r++)
        for (let c = 0; c < s.current.shape[r].length; c++)
          if (s.current.shape[r][c])
            drawBlock(ctx, bx + (s.current.x + c) * cs, by + (s.current.y + r) * cs, COLORS[s.current.color], cs);
    }
    ctx.restore();

    // Panels
    const lx = (W - totalW) / 2;
    const miniCs = cs * 0.8;
    const panelPW = panelW - cs * 0.4;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(180,0,255,0.35)';
    ctx.fillRect(lx, by, panelPW, cs * 6);
    ctx.strokeRect(lx, by, panelPW, cs * 6);
    ctx.fillStyle = '#c200ff';
    ctx.textAlign = 'center';
    ctx.font = `bold ${cs * 0.42}px Orbitron, sans-serif`;
    ctx.fillText('HOLD', lx + panelPW / 2, by + cs * 0.85);
    if (s.hold) drawMini(ctx, PIECES[s.hold].shape, s.hold, lx, by + cs, panelPW, cs * 4.5, miniCs);
    ctx.restore();

    const rx = bx + boardW + cs * 0.4;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.fillRect(rx, by, panelPW, cs * 6);
    ctx.strokeRect(rx, by, panelPW, cs * 6);
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.font = `bold ${cs * 0.42}px Orbitron, sans-serif`;
    ctx.fillText('NEXT', rx + panelPW / 2, by + cs * 0.85);
    if (s.next) drawMini(ctx, PIECES[s.next].shape, s.next, rx, by + cs, panelPW, cs * 4.5, miniCs);
    ctx.restore();

    // HUD
    const scoreY = by + cs * 7;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,18,0.72)';
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.fillRect(rx, scoreY, panelW - cs * 0.4, cs * 9);
    ctx.strokeRect(rx, scoreY, panelW - cs * 0.4, cs * 9);
    const labels = [
      { label: 'SCORE', value: s.score, color: '#ffe066' },
      { label: 'LINES', value: s.lines, color: '#00ffcc' },
      { label: 'LEVEL', value: s.level, color: '#ff2d78' },
    ];
    labels.forEach(({ label, value, color }, i) => {
      const ty = scoreY + cs * 1.4 + i * cs * 2.6;
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.font = `bold ${cs * 0.38}px Orbitron, sans-serif`;
      ctx.fillText(label, rx + (panelW - cs * 0.4) / 2, ty);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${cs * 0.62}px Orbitron, sans-serif`;
      ctx.fillText(String(value), rx + (panelW - cs * 0.4) / 2, ty + cs * 0.9);
    });
    ctx.restore();

    if (s.status === 'paused') {
      ctx.fillStyle = 'rgba(4,0,18,0.75)';
      ctx.fillRect(bx - 2, by, boardW + 4, cs * ROWS);
      ctx.textAlign = 'center';
      ctx.font = `bold ${cs * 0.72}px Orbitron, sans-serif`;
      ctx.fillStyle = '#c200ff';
      ctx.fillText('PAUSED', bx + boardW / 2, by + cs * ROWS / 2);
    }
  }, [drawBlock, drawMini, stateRef]);

  const dropInterval = useCallback(() => {
    const s = stateRef.current;
    if (!s) return 800;
    const base = LEVEL_SPEED[s.level] ?? 80;
    return s.softDrop ? Math.max(50, base / 8) : base;
  }, [stateRef]);

  useEffect(() => {
    initState();
    const cv = canvasRef.current;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;

    const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    const onKey = (e) => {
      if (lbVisibleRef.current) return;
      const s = stateRef.current;
      if (!s) return;

      if (e.code === 'KeyR') { initState(); lastDropRef.current = performance.now(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        s.status = s.status === 'playing' ? 'paused' : 'playing';
        return;
      }
      if (s.status !== 'playing') return;

      if (e.code === 'ArrowLeft') handleAction('Left');
      else if (e.code === 'ArrowRight') handleAction('Right');
      else if (e.code === 'ArrowDown') s.softDrop = true;
      else if (e.code === 'ArrowUp' || e.code === 'KeyX') handleAction('Rotate');
      else if (e.code === 'KeyZ') {
        const rotL = rotate(rotate(rotate(s.current.shape)));
        const kicks = [0, 1, -1, 2, -2];
        for (const k of kicks) {
          if (fits(s.board, rotL, s.current.x + k, s.current.y)) {
            s.current.shape = rotL; s.current.x += k; break;
          }
        }
      } else if (e.code === 'Space') { e.preventDefault(); handleAction('HardDrop'); }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') handleAction('Hold');
    };

    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown') {
        const s = stateRef.current;
        if (s) s.softDrop = false;
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    let lastRaf = 0;
    const loop = (ts) => {
      animRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;
      if (s && s.status === 'playing') {
        const elapsed = ts - lastDropRef.current;
        if (elapsed >= dropInterval()) {
          const moved = fits(s.board, s.current.shape, s.current.x, s.current.y + 1);
          if (moved) s.current.y++;
          else lockAndNext();
          lastDropRef.current = ts;
        }
      }
      if (ts - lastRaf > 16) { render(); lastRaf = ts; }
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    };
  }, [initState, handleAction, lockAndNext, dropInterval, render, stateRef, lastDropRef]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 10, display: 'block', width: '100%', height: '100%' }} />
      <HomeButton />
      <DesktopControls t={t} />
      {isMobile && (
        <TetrisMobileControls
          onAction={handleAction}
          onSoftDropStart={() => { const s = stateRef.current; if (s) s.softDrop = true; }}
          onSoftDropEnd={() => { const s = stateRef.current; if (s) s.softDrop = false; }}
        />
      )}
      <Leaderboard
        apiUrl={`${process.env.REACT_APP_SERVER_URL}/leaderboard/tetris`}
        score={score}
        sessionToken={sessionToken}
        onPlayAgain={initState}
        visible={lbVisible}
      />
    </div>
  );
}
