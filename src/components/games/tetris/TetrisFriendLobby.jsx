import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OnlineTetrisGame from './OnlineTetrisGame';
import HomeButton from '../../ui/HomeButton';
import RetroGrid from '../../ui/RetroGrid';

function TetrisFriendLobby({ socket }) {
  const [phase, setPhase]       = useState('form');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId]     = useState('');
  const [gameData, setGameData] = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    const onWaiting = () => setPhase('waiting');
    const onReady   = ({ room, opponent }) => { setGameData({ room, opponent }); setPhase('game'); };
    socket.on('tetris-waiting',    onWaiting);
    socket.on('tetris-room-ready', onReady);
    return () => { socket.off('tetris-waiting', onWaiting); socket.off('tetris-room-ready', onReady); };
  }, [socket]);

  const join = (e) => {
    e.preventDefault();
    const name = username.trim();
    const room = roomId.trim();
    if (!name) { setError('Enter your username'); return; }
    if (!room) { setError('Enter a room ID'); return; }
    setError('');
    socket.emit('tetris-join-room', { room, username: name });
  };

  if (phase === 'game' && gameData) {
    return <OnlineTetrisGame socket={socket} room={gameData.room} opponentName={gameData.opponent} />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 380,
        background: 'rgba(4,0,18,0.80)',
        border: '1.5px solid rgba(0,229,255,0.30)',
        borderRadius: 6, padding: '38px 36px 32px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 40px rgba(0,229,255,0.14), inset 0 0 40px rgba(0,100,255,0.04)',
        display: 'flex', flexDirection: 'column', gap: 0,
        alignItems: 'center',
      }}>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 13,
          color: '#00e5ff', letterSpacing: '0.5em', marginBottom: 6,
          textShadow: '0 0 10px #00e5ff88',
        }}>TETRIS</div>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 20,
          color: '#fff', letterSpacing: '0.12em', marginBottom: 28, textTransform: 'uppercase',
        }}>PLAY WITH FRIEND</div>

        {phase === 'form' && (
          <form onSubmit={join} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              placeholder="YOUR USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={16}
              style={inputStyle}
            />
            <input
              placeholder="ROOM ID"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              maxLength={24}
              style={inputStyle}
            />
            {error && (
              <div style={{ color: '#ff2d78', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.1em' }}>
                {error}
              </div>
            )}
            <button type="submit" style={btnStyle('#00e5ff')}
              onMouseEnter={e => { e.currentTarget.style.background = '#00e5ff18'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,0,18,0.65)'; e.currentTarget.style.color = '#00e5ff'; }}
            >
              JOIN ROOM
            </button>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.1em', textAlign: 'center' }}>
              SHARE THE ROOM ID WITH YOUR FRIEND
            </div>
          </form>
        )}

        {phase === 'waiting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 32, color: '#00e5ff',
              letterSpacing: '0.3em', animation: 'glowPulse 2s ease-in-out infinite',
              textShadow: '0 0 16px #00e5ff',
            }}>WAITING…</div>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: '0.12em' }}>
              ROOM: {roomId}
            </div>
            <button onClick={() => setPhase('form')} style={{
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
  background: 'rgba(0,229,255,0.05)', border: '1.5px solid rgba(0,229,255,0.25)',
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

export default TetrisFriendLobby;
