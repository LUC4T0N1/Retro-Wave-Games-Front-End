import { useState, useEffect } from 'react'
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import isMobile from "../../utils/isMobile";
import "./Home.css";

function NeonButton({ children, onClick, to, color = '#00e5ff', size = 'md', delay = 0 }) {
  const [hov, setHov] = useState(false);
  const lg = size === 'lg';
  const style = {
    display: 'block',
    width: '100%',
    padding: lg ? '13px 28px' : '10px 20px',
    background: hov ? `${color}18` : 'rgba(4,0,18,0.65)',
    border: `2px solid ${color}`,
    borderRadius: 3,
    color: hov ? '#fff' : color,
    fontFamily: "'Orbitron', sans-serif",
    fontSize: lg ? 15 : 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    transition: 'none',
    textAlign: 'center',
    boxShadow: hov
      ? `0 0 24px ${color}99, 0 0 48px ${color}44, inset 0 0 16px ${color}22`
      : `0 0 8px ${color}33`,
    animation: `fadeDown 0.4s ${delay}s both`,
    backdropFilter: isMobile ? 'none' : 'blur(12px)',
    textTransform: 'uppercase',
    textDecoration: 'none',
    boxSizing: 'border-box',
  };

  if (to) {
    return (
      <Link to={to} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={style}>
      {children}
    </button>
  );
}

function Home({ socket }) {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState('games');
  const currentLang = (i18n.language || 'en').substring(0, 2);

  useEffect(() => {
    socket.emit("leave-room");
    const serverUrl = process.env.REACT_APP_SERVER_URL;
    if (serverUrl) {
      fetch(serverUrl).catch(() => { });
    }
  }, [location, socket]);


  const pongScreens = ['pong', 'pong-single', 'pong-multi'];
  const pacmanScreens = ['pacman', 'pacman-multi'];
  const tetrisScreens = ['tetris', 'tetris-multi'];
  const snakeScreens = ['snake', 'snake-multi'];
  const breakoutScreens = ['breakout', 'breakout-multi'];
  const infrunScreens = ['infinity-run', 'infinity-run-multi'];

  const screenTitle = screen === 'games' ? 'ARCADE'
    : pongScreens.includes(screen) ? 'PONG'
      : pacmanScreens.includes(screen) ? 'PACMAN'
        : tetrisScreens.includes(screen) ? 'TETRIS'
          : snakeScreens.includes(screen) ? 'SNAKE'
            : breakoutScreens.includes(screen) ? 'BREAKOUT'
              : infrunScreens.includes(screen) ? 'INFINITY RUN'
                : t('tictactoe');

  const backBtnStyle = {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.32)',
    fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.15em',
    cursor: 'pointer', marginTop: 4, transition: 'color 0.15s', textTransform: 'uppercase',
  };

  const subLabelStyle = (color) => ({
    fontSize: 10, letterSpacing: '0.28em', color, opacity: 0.75,
    textAlign: 'center', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase',
    fontFamily: "'Orbitron', sans-serif",
  });

  return (
    <div className="home-container">
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/background.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Scanlines overlay */}
      {!isMobile && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 80,
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.055) 50%, transparent 50%)',
          backgroundSize: '100% 4px',
        }} />
      )}

      {/* Language toggle */}
      <div style={{
        position: 'fixed', top: 24, right: isMobile ? 12 : 28, zIndex: 50, display: 'flex',
        border: '1.5px solid #6600cc88', borderRadius: 3, overflow: 'hidden',
      }}>
        {['pt', 'en'].map(l => (
          <button key={l} onClick={() => i18n.changeLanguage(l)} style={{
            padding: isMobile ? '5px 10px' : '7px 16px',
            background: currentLang === l ? '#6600ccaa' : 'rgba(4,0,18,0.75)',
            border: 'none',
            color: currentLang === l ? '#fff' : '#8844ccbb',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isMobile ? 9 : 10, fontWeight: 700, letterSpacing: '0.1em',
            cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: currentLang === l ? '0 0 14px #6600cc55' : 'none',
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 20px',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(26px, 5.5vw, 62px)',
            fontWeight: 900, letterSpacing: '0.12em', color: '#fff',
            animation: isMobile ? 'logoIn 1s cubic-bezier(.22,1,.36,1) both' : 'logoIn 1s cubic-bezier(.22,1,.36,1) both, glowPulse 3.2s 1s ease-in-out infinite',
            lineHeight: 1.1, textTransform: 'uppercase', margin: 0, marginLeft: '0.12em',
          }}>{screenTitle}</h1>
          <div style={{
            height: 3, width: '74%', margin: '14px auto 0',
            background: 'linear-gradient(90deg, transparent, #ff7a2dff, #ff0000ff, #6200ffff, transparent)',
            boxShadow: '0 0 14px #020101ff, 0 0 28px #cc00ff55', borderRadius: 2,
          }} />
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'rgba(4,0,18,0.72)',
          border: '1.5px solid rgba(0,229,255,0.30)',
          borderRadius: 6, padding: '24px 28px 20px',
          backdropFilter: isMobile ? 'none' : 'blur(16px)',
          boxShadow: '0 0 40px rgba(180,0,255,0.18), 0 0 80px rgba(100,0,255,0.08), inset 0 0 40px rgba(100,0,255,0.04)',
        }}>
          {screen === 'games' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.5s both' }}>
              <NeonButton color="#ff2d78" size="lg" onClick={() => setScreen('home')} delay={0.10}>
                {t('tictactoe')}
              </NeonButton>
              <NeonButton color="#cc00ff" size="lg" onClick={() => setScreen('pacman')} delay={0.20}>
                PACMAN
              </NeonButton>
              <NeonButton color="#00ffcc" size="lg" onClick={() => setScreen('snake')} delay={0.30}>
                SNAKE
              </NeonButton>
              <NeonButton color="#ffb852" size="lg" onClick={() => setScreen('breakout')} delay={0.40}>
                BREAKOUT
              </NeonButton>
              <NeonButton color="#ff2d78" size="lg" onClick={() => setScreen('tetris')} delay={0.50}>
                TETRIS
              </NeonButton>
              <NeonButton color="#00b4ff" size="lg" onClick={() => setScreen('infinity-run')} delay={0.60}>
                INFINITY RUN
              </NeonButton>
              <NeonButton color="#ff8c00" size="lg" onClick={() => setScreen('pong')} delay={0.70}>
                PONG
              </NeonButton>
            </div>
          )}

          {screen === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.5s both' }}>
              <NeonButton color="#ff2d78" size="lg" onClick={() => setScreen('multi')} delay={0.10}>
                {t('multiplayer')}
              </NeonButton>
              <NeonButton color="#00e5ff" size="lg" onClick={() => setScreen('single')} delay={0.20}>
                {t('singleplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#ff2d78')}>{t('choose-mode')}</div>
              <NeonButton color="#ff2d78" to="/tic-tac-toe/local" delay={0}>{t('local')}</NeonButton>
              <NeonButton color="#ff2d78" to="/tic-tac-toe/friend" delay={0.07}>{t('friend')}</NeonButton>
              <NeonButton color="#ff2d78" to="/tic-tac-toe/random" delay={0.14}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('home')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'pong' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#ff8c00" size="lg" onClick={() => setScreen('pong-single')} delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#ff8c00" size="lg" onClick={() => setScreen('pong-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'pong-single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#ff8c00')}>{t('choose-diff')}</div>
              <NeonButton color="#ff8c00" to="/pong/easy" delay={0}>{t('easy')}</NeonButton>
              <NeonButton color="#ff8c00" to="/pong/medium" delay={0.07}>{t('medium')}</NeonButton>
              <NeonButton color="#ff8c00" to="/pong/hard" delay={0.14}>{t('hard')}</NeonButton>
              <button
                onClick={() => setScreen('pong')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'pong-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#ff8c00')}>{t('choose-mode')}</div>
              <NeonButton color="#ff8c00" to="/pong/local" delay={0}>{t('local')}</NeonButton>
              <NeonButton color="#ff8c00" to="/pong/friend" delay={0.07}>{t('with-friend')}</NeonButton>
              <NeonButton color="#ff8c00" to="/pong/random" delay={0.14}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('pong')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'pacman' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#cc00ff" size="lg" to="/pacman" delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#cc00ff" size="lg" onClick={() => setScreen('pacman-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'pacman-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#cc00ff')}>{t('choose-mode')}</div>
              <NeonButton color="#cc00ff" to="/pacman/friend" delay={0}>{t('with-friend')}</NeonButton>
              <NeonButton color="#cc00ff" to="/pacman/random" delay={0.07}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('pacman')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'snake' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#00ffcc" size="lg" to="/snake" delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#00ffcc" size="lg" onClick={() => setScreen('snake-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'snake-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#00ffcc')}>{t('choose-mode')}</div>
              <NeonButton color="#00ffcc" to="/snake/friend" delay={0}>{t('with-friend')}</NeonButton>
              <NeonButton color="#00ffcc" to="/snake/random" delay={0.07}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('snake')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'breakout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#ffb852" size="lg" to="/breakout" delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#ffb852" size="lg" onClick={() => setScreen('breakout-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'breakout-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#ffb852')}>{t('choose-mode')}</div>
              <NeonButton color="#ffb852" to="/breakout/friend" delay={0}>{t('with-friend')}</NeonButton>
              <NeonButton color="#ffb852" to="/breakout/random" delay={0.07}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('breakout')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'infinity-run' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#00b4ff" size="lg" to="/infinity-run" delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#00b4ff" size="lg" onClick={() => setScreen('infinity-run-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'infinity-run-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#00b4ff')}>{t('choose-mode')}</div>
              <NeonButton color="#00b4ff" to="/infinity-run/friend" delay={0}>{t('with-friend')}</NeonButton>
              <NeonButton color="#00b4ff" to="/infinity-run/random" delay={0.07}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('infinity-run')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'tetris' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s both' }}>
              <NeonButton color="#ff2d78" size="lg" to="/tetris" delay={0.10}>
                {t('singleplayer')}
              </NeonButton>
              <NeonButton color="#ff2d78" size="lg" onClick={() => setScreen('tetris-multi')} delay={0.20}>
                {t('multiplayer')}
              </NeonButton>
              <button
                onClick={() => setScreen('games')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'tetris-multi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#ff2d78')}>{t('choose-mode')}</div>
              <NeonButton color="#ff2d78" to="/tetris/friend" delay={0}>{t('with-friend')}</NeonButton>
              <NeonButton color="#ff2d78" to="/tetris/random" delay={0.07}>{t('random-opponent')}</NeonButton>
              <button
                onClick={() => setScreen('tetris')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}

          {screen === 'single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeUp 0.4s both' }}>
              <div style={subLabelStyle('#00e5ff')}>{t('choose-diff')}</div>
              <NeonButton color="#00e5ff" to="/tic-tac-toe/easy" delay={0}>{t('easy')}</NeonButton>
              <NeonButton color="#00e5ff" to="/tic-tac-toe/random-ia" delay={0.07}>{t('random')}</NeonButton>
              <NeonButton color="#00e5ff" to="/tic-tac-toe/hard" delay={0.14}>{t('hard')}</NeonButton>
              <button
                onClick={() => setScreen('home')}
                style={backBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(188, 222, 241, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
              >{t('back')}</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 28,
          fontFamily: "'VT323', monospace",
          fontSize: 17,
          color: 'rgba(255, 0, 128, 0.65)',
          letterSpacing: '0.3em',
          textShadow: '0 0 10px #00a2ffff',
          animation: 'floatBob 3s ease-in-out infinite',
        }}>
          INSERT COIN TO CONTINUE
        </div>
      </div>
    </div>
  );
}

export default Home;
