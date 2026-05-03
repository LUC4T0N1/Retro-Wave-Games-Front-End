import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Patterns } from '../../utils/EndGame';
import Chat from '../chat/Chat';
import HomeButton from '../ui/HomeButton';
import RetroGrid from '../ui/RetroGrid';
import isMobile from '../../utils/isMobile';
import './SinglePlayerScreen.css';

/* ── SVG X mark ── */
function MarkX({ progress = 1 }) {
  const s = 70;
  return (
    <svg width="80%" height="80%" viewBox={`0 0 ${s * 2} ${s * 2}`} style={{ overflow: 'visible', display: 'block' }}>
      <line
        x1={s * 0.25} y1={s * 0.25}
        x2={s * 0.25 + s * 1.5 * progress} y2={s * 0.25 + s * 1.5 * progress}
        stroke="#00e5ff" strokeWidth="6" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 8px #00e5ff) drop-shadow(0 0 20px #00e5ff88)' }}
      />
      {progress > 0.5 && (
        <line
          x1={s * 1.75} y1={s * 0.25}
          x2={s * 1.75 - s * 1.5 * (progress - 0.5) * 2} y2={s * 0.25 + s * 1.5 * (progress - 0.5) * 2}
          stroke="#00e5ff" strokeWidth="6" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px #00e5ff) drop-shadow(0 0 20px #00e5ff88)' }}
        />
      )}
    </svg>
  );
}

/* ── SVG O mark ── */
function MarkO({ progress = 1 }) {
  const r = 68, cx = 90, cy = 90;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="80%" height="80%" viewBox="0 0 180 180" style={{ overflow: 'visible', display: 'block' }}>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#ff2d78" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        transform="rotate(-90, 90, 90)"
        style={{ filter: 'drop-shadow(0 0 8px #ff2d78) drop-shadow(0 0 20px #ff2d7888)' }}
      />
    </svg>
  );
}

/* ── Win line overlay ── */
function WinLine({ line, size }) {
  if (!line || line.length < 3) return null;
  const s = size / 3;
  const center = i => ({ x: (i % 3) * s + s / 2, y: Math.floor(i / 3) * s + s / 2 });
  const a = center(line[0]), b = center(line[2]);
  const len = Math.hypot(b.x - a.x, b.y - a.y) + 40;
  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <line
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke="#ff6600" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len}
        style={{
          filter: 'drop-shadow(0 0 10px #ff6600) drop-shadow(0 0 24px #ff660099)',
          animation: 'winLineGrow 0.5s ease-out both',
        }}
      />
    </svg>
  );
}

/* ── Cell ── */
function Cell({ value, onClick, isWin, animProgress }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%',
        cursor: value ? 'default' : 'pointer',
        background: isWin
          ? 'rgba(255,102,0,0.08)'
          : hover && !value ? 'rgba(0,229,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: 4,
        animation: value ? 'cellPop 0.3s cubic-bezier(.22,1,.36,1) both' : 'none',
      }}
    >
      {value === 'X' && <MarkX progress={animProgress} />}
      {value === 'O' && <MarkO progress={animProgress} />}
      {!value && hover && (
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px dashed rgba(0,229,255,0.3)', opacity: 0.5,
        }} />
      )}
    </div>
  );
}

/* ── Status banner ── */
function StatusBanner({ resultState, resultWinner, currentPlayer, t, lang }) {
  let text, color, anim;
  if (resultState === 'none') {
    text = lang === 'pt' ? `VEZ DO ${currentPlayer}` : `${currentPlayer}'S TURN`;
    color = currentPlayer === 'X' ? '#00e5ff' : '#ff2d78';
    anim = currentPlayer === 'X' ? 'glowPulseC 2s ease-in-out infinite' : 'glowPulseP 2s ease-in-out infinite';
  } else if (resultState === 'tie') {
    text = t('tie');
    color = '#c200ff';
    anim = 'winPop 0.5s cubic-bezier(.22,1,.36,1) both';
  } else {
    text = `${resultWinner} — ${t('won')}`;
    color = resultWinner === 'X' ? '#00e5ff' : '#ff2d78';
    anim = 'winPop 0.5s cubic-bezier(.22,1,.36,1) both';
  }
  return (
    <div style={{
      fontFamily: "'Orbitron', sans-serif",
      fontSize: 'clamp(13px, 2.4vw, 22px)',
      fontWeight: 900, letterSpacing: '0.18em',
      color: '#fff', textTransform: 'uppercase',
      animation: anim,
      textShadow: `0 0 10px ${color}, 0 0 24px ${color}88`,
    }}>{text}</div>
  );
}

/* ── Score bar ── */
function ScoreBar({ score, lang }) {
  const drawLabel = lang === 'pt' ? 'EMPATES' : 'DRAWS';
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
      {[['X', '#00e5ff'], ['O', '#ff2d78']].map(([p, c]) => (
        <div key={p} style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 10,
            letterSpacing: '0.2em', color: c, opacity: 0.7,
            textTransform: 'uppercase', marginBottom: 4,
          }}>{p}</div>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 34,
            color: c, lineHeight: 1,
            textShadow: `0 0 14px ${c}, 0 0 30px ${c}66`,
          }}>{score[p] || 0}</div>
        </div>
      ))}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 10,
          letterSpacing: '0.2em', color: '#ffffff55', marginBottom: 4,
        }}>{drawLabel}</div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 34, color: '#ffffff44', lineHeight: 1 }}>
          {score.draw || 0}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
function OnlineScreen({ result, chooseSquare, handleRestart, board, socket, username, room, letterSelectionNode }) {
  const { t, i18n } = useTranslation();
  const markAnimRef = useRef({});
  const prevResultState = useRef('none');
  const prevBoard = useRef(board);

  const [anims, setAnims] = useState(Array(9).fill(0));
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const [winLine, setWinLine] = useState(null);
  const [isWide, setIsWide] = useState(window.innerWidth >= 780);

  const lang = (i18n.language || 'en').substring(0, 2);
  const gameOver = result.state !== 'none';
  const isSelecting = !!letterSelectionNode;

  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= 780);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const BOARD_SIZE = Math.min(
    window.innerWidth * (isWide ? 0.36 : 0.78),
    window.innerHeight * (isWide ? 0.50 : 0.38),
    isWide ? 390 : 380
  );
  const CELL = BOARD_SIZE / 3;
  const lineColor = 'rgba(0,200,255,0.90)';

  const xCount = board.filter(v => v === 'X').length;
  const oCount = board.filter(v => v === 'O').length;
  const currentPlayer = xCount === oCount ? 'X' : 'O';
  const turnColor = !gameOver ? (currentPlayer === 'X' ? '#00e5ff' : '#ff2d78') : '#ff6600';

  /* Animate newly placed marks */
  useEffect(() => {
    board.forEach((val, idx) => {
      if (val && !prevBoard.current[idx]) {
        const start = performance.now();
        const dur = 380;
        function step(now) {
          const p = Math.min(1, (now - start) / dur);
          setAnims(prev => { const a = [...prev]; a[idx] = p; return a; });
          if (p < 1) markAnimRef.current[idx] = requestAnimationFrame(step);
        }
        markAnimRef.current[idx] = requestAnimationFrame(step);
      }
    });
    prevBoard.current = [...board];
  }, [board]);

  /* Track score and win line on game end */
  useEffect(() => {
    if (result.state === prevResultState.current) return;
    if (result.state === 'won') {
      setScore(prev => ({ ...prev, [result.winner]: (prev[result.winner] || 0) + 1 }));
      const line = Patterns.find(pat =>
        board[pat[0]] !== '' &&
        board[pat[0]] === board[pat[1]] &&
        board[pat[1]] === board[pat[2]]
      );
      setWinLine(line || null);
    } else if (result.state === 'tie') {
      setScore(prev => ({ ...prev, draw: prev.draw + 1 }));
      setWinLine(null);
    }
    prevResultState.current = result.state;
  }, [result.state]);

  const wrappedRestart = () => {
    Object.values(markAnimRef.current).forEach(id => cancelAnimationFrame(id));
    markAnimRef.current = {};
    setAnims(Array(9).fill(0));
    setWinLine(null);
    handleRestart();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', height: '100%',
        display: 'flex',
        flexDirection: isWide ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isWide ? '20px 28px' : '12px 16px',
        gap: isWide ? 28 : 16,
        overflowY: isWide ? 'hidden' : 'auto',
        boxSizing: 'border-box',
      }}>

        <HomeButton />

        {/* Board / Letter Selection column */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          flex: isWide ? '0 0 auto' : 'none',
          width: isWide ? 'auto' : '100%',
        }}>
          {isSelecting ? (
            <div style={{ width: BOARD_SIZE + 36, maxWidth: '90vw' }}>
              {letterSelectionNode}
            </div>
          ) : (
            <>
              {/* Score */}
              <div style={{ marginBottom: 12, animation: 'spFadeUp 0.5s both' }}>
                <ScoreBar score={score} lang={lang} />
              </div>

              {/* Status */}
              <div style={{ marginBottom: 14, minHeight: 30, display: 'flex', alignItems: 'center', animation: 'spFadeUp 0.5s 0.1s both' }}>
                <StatusBanner
                  resultState={result.state}
                  resultWinner={result.winner}
                  currentPlayer={currentPlayer}
                  t={t}
                  lang={lang}
                />
              </div>

              {/* Board */}
              <div style={{ position: 'relative', width: BOARD_SIZE, height: BOARD_SIZE, animation: 'spFadeUp 0.5s 0.2s both' }}>

                {/* Board card background */}
                <div style={{
                  position: 'absolute', inset: isWide ? -16 : -10,
                  background: 'rgba(4,0,20,0.55)',
                  border: `1.5px solid ${turnColor}44`,
                  borderRadius: 10,
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 0 30px ${turnColor}22, inset 0 0 30px rgba(0,0,30,0.3)`,
                  transition: 'border-color 0.4s, box-shadow 0.4s',
                }} />

                {/* Grid lines */}
                <svg width={BOARD_SIZE} height={BOARD_SIZE} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {[1, 2].map(i => (
                    <line key={`v${i}`} x1={CELL * i} y1={12} x2={CELL * i} y2={BOARD_SIZE - 12}
                      stroke={lineColor} strokeWidth="4" strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 20px #0066ffaa)' }} />
                  ))}
                  {[1, 2].map(i => (
                    <line key={`h${i}`} x1={12} y1={CELL * i} x2={BOARD_SIZE - 12} y2={CELL * i}
                      stroke={lineColor} strokeWidth="4" strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 20px #0066ffaa)' }} />
                  ))}
                </svg>

                {/* Cells */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
                  width: BOARD_SIZE, height: BOARD_SIZE, position: 'relative',
                }}>
                  {board.map((val, i) => (
                    <Cell
                      key={i}
                      value={val}
                      onClick={() => chooseSquare(i)}
                      isWin={!!winLine && winLine.includes(i)}
                      animProgress={anims[i]}
                    />
                  ))}
                </div>

                {/* Win line */}
                {winLine && result.state === 'won' && (
                  <WinLine line={winLine} size={BOARD_SIZE} />
                )}
              </div>

              {/* Restart button */}
              <div style={{ marginTop: 16, animation: 'spFadeUp 0.5s 0.3s both' }}>
                <button onClick={wrappedRestart} style={{
                  padding: '11px 30px',
                  background: gameOver ? 'rgba(255,102,0,0.12)' : 'rgba(4,0,18,0.6)',
                  border: `2px solid ${gameOver ? '#ff6600' : 'rgba(0,229,255,0.4)'}`,
                  borderRadius: 3,
                  color: gameOver ? '#ff6600' : 'rgba(0,229,255,0.7)',
                  fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.14em', cursor: 'pointer', transition: 'all 0.16s',
                  textTransform: 'uppercase',
                  boxShadow: gameOver ? '0 0 20px #ff660066, 0 0 40px #ff660033' : '0 0 8px rgba(0,229,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  animation: gameOver ? 'spFloatBob 2s ease-in-out infinite' : 'none',
                  boxSizing: 'border-box',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = gameOver ? 'rgba(255,102,0,0.22)' : 'rgba(0,229,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = gameOver ? 'rgba(255,102,0,0.12)' : 'rgba(4,0,18,0.6)'; e.currentTarget.style.color = gameOver ? '#ff6600' : 'rgba(0,229,255,0.7)'; }}
                >{t('restart')}</button>
              </div>
            </>
          )}
        </div>

        {/* Chat column */}
        <div style={{
          flex: isWide ? '0 0 auto' : 'none',
          alignSelf: isWide ? 'center' : 'stretch',
        }}>
          <Chat socket={socket} username={username} room={room} />
        </div>

        {/* Turn glow bar at bottom */}
        {!gameOver && !isSelecting && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${turnColor}, transparent)`,
            boxShadow: `0 0 12px ${turnColor}`,
            transition: 'all 0.3s', opacity: 0.8,
          }} />
        )}
      </div>
    </div>
  );
}

export default OnlineScreen;
