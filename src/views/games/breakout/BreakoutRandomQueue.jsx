import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OnlineBreakoutGame from './OnlineBreakoutGame';
import { containsProfanity } from '../../../utils/profanity';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';

function BreakoutRandomQueue({ socket }) {
  const { t } = useTranslation();
  const [phase, setPhase]       = useState('form');
  const [username, setUsername] = useState('');
  const [gameData, setGameData] = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    const onStart = ({ room, opponent }) => { setGameData({ room, opponent }); setPhase('game'); };
    socket.on('breakout-game-start', onStart);
    return () => {
      socket.off('breakout-game-start', onStart);
      socket.emit('breakout-leave-queue');
    };
  }, [socket]);

  const joinQueue = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) { setError('Enter your username'); return; }
    if (containsProfanity(name)) { setError(t('profanity-warning')); return; }
    setError('');
    socket.emit('breakout-join-queue', { username: name });
    setPhase('queued');
  };

  const leaveQueue = () => {
    socket.emit('breakout-leave-queue');
    setPhase('form');
  };

  if (phase === 'game' && gameData) {
    return <OnlineBreakoutGame socket={socket} room={gameData.room} opponentName={gameData.opponent} />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 380,
        background: 'rgba(4,0,18,0.80)',
        border: '1.5px solid rgba(255,184,82,0.25)',
        borderRadius: 6, padding: '38px 36px 32px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 40px rgba(255,184,82,0.10), inset 0 0 40px rgba(255,184,82,0.04)',
        display: 'flex', flexDirection: 'column', gap: 0,
        alignItems: 'center',
      }}>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 13,
          color: '#ffb852', letterSpacing: '0.5em', marginBottom: 6,
          textShadow: '0 0 10px #ffb85288',
        }}>BREAKOUT</div>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 20,
          color: '#fff', letterSpacing: '0.12em', marginBottom: 28, textTransform: 'uppercase',
        }}>RANDOM OPPONENT</div>

        {phase === 'form' && (
          <form onSubmit={joinQueue} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              placeholder="YOUR USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={16}
              style={inputStyle}
            />
            {error && (
              <div style={{ color: '#ffb852', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.1em' }}>
                {error}
              </div>
            )}
            <button type="submit" style={btnStyle('#ffb852')}
              onMouseEnter={e => { e.currentTarget.style.background = '#ffb85218'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = '#ffb852'; }}
            >
              FIND MATCH
            </button>
          </form>
        )}

        {phase === 'queued' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 32, color: '#ffb852',
              letterSpacing: '0.3em', animation: 'glowPulse 2s ease-in-out infinite',
              textShadow: '0 0 16px #ffb852',
            }}>SEARCHING…</div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.12em' }}>
              LOOKING FOR AN OPPONENT
            </div>
            <button onClick={leaveQueue} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)',
              fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.15em',
              cursor: 'pointer', textTransform: 'uppercase',
            }}>CANCEL</button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
  background: 'rgba(255,184,82,0.05)', border: '1.5px solid rgba(255,184,82,0.25)',
  borderRadius: 3, color: '#fff', fontFamily: "'Orbitron', sans-serif",
  fontSize: 12, letterSpacing: '0.1em', outline: 'none',
  textTransform: 'uppercase',
};

const btnStyle = (color) => ({
  width: '100%', padding: '13px 28px', boxSizing: 'border-box',
  background: 'rgba(4,0,18,0.65)', border: `2px solid ${color}`,
  borderRadius: 3, color: color, fontFamily: "'Orbitron', sans-serif",
  fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer',
  transition: 'all 0.16s', textTransform: 'uppercase',
  boxShadow: `0 0 8px ${color}33`,
});

export default BreakoutRandomQueue;
