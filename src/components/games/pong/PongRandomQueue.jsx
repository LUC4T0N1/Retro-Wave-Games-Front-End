import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OnlinePongGame from './OnlinePongGame';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

function PongRandomQueue({ socket }) {
  const [phase, setPhase]       = useState('form'); // 'form' | 'queued' | 'game'
  const [username, setUsername] = useState('');
  const [gameData, setGameData] = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    const onStart = ({ side, room, opponent }) => { setGameData({ side, room, opponent }); setPhase('game'); };
    socket.on('pong-game-start', onStart);
    return () => {
      socket.off('pong-game-start', onStart);
      socket.emit('pong-leave-queue'); // safe to call even if not queued; server ignores unknown ids
    };
  }, [socket]);

  const joinQueue = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) { setError('Enter your username'); return; }
    setError('');
    socket.emit('pong-join-queue', { username: name });
    setPhase('queued');
  };

  const leaveQueue = () => {
    socket.emit('pong-leave-queue');
    setPhase('form');
  };

  if (phase === 'game' && gameData) {
    return (
      <OnlinePongGame
        socket={socket}
        room={gameData.room}
        side={gameData.side}
        opponentName={gameData.opponent}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 380,
        background: 'rgba(4,0,18,0.80)',
        border: '1.5px solid rgba(255,45,120,0.30)',
        borderRadius: 6, padding: '38px 36px 32px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 40px rgba(255,45,120,0.10), inset 0 0 40px rgba(100,0,255,0.04)',
        display: 'flex', flexDirection: 'column', gap: 0,
        alignItems: 'center',
      }}>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 13,
          color: '#ff2d78', letterSpacing: '0.5em', marginBottom: 6,
          textShadow: '0 0 10px #ff2d7888',
        }}>PONG</div>
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
              <div style={{ color: '#ff2d78', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.1em' }}>
                {error}
              </div>
            )}
            <button type="submit" style={btnStyle('#ff2d78')}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff2d7818'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = '#ff2d78'; }}
            >
              FIND MATCH
            </button>
          </form>
        )}

        {phase === 'queued' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 32, color: '#ff2d78',
              letterSpacing: '0.3em', animation: 'glowPulse 2s ease-in-out infinite',
              textShadow: '0 0 16px #ff2d78',
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
  background: 'rgba(255,45,120,0.05)', border: '1.5px solid rgba(255,45,120,0.25)',
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

export default PongRandomQueue;
