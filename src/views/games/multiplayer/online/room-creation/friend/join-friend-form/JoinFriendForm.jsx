import { useTranslation } from 'react-i18next';

const inputBase = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(0,10,40,0.7)',
  borderRadius: 4, outline: 'none',
  fontFamily: "'Orbitron', sans-serif", fontSize: 12, letterSpacing: '0.06em',
  boxSizing: 'border-box',
};

function JoinForm({ setUsername, setRoom, joinRoom }) {
  const { t } = useTranslation();

  return (
    <div style={{
      background: 'rgba(4,0,20,0.75)',
      border: '1.5px solid rgba(0,229,255,0.22)',
      borderRadius: 8, padding: '40px 40px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 0 40px rgba(0,229,255,0.05), 0 0 80px rgba(80,0,120,0.12)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      width: 320, boxSizing: 'border-box',
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(11px, 2vw, 16px)',
        fontWeight: 900, letterSpacing: '0.18em',
        color: '#00e5ff', textTransform: 'uppercase', textAlign: 'center',
        textShadow: '0 0 14px #00e5ff, 0 0 30px #00e5ff44',
        marginBottom: 8,
      }}>{t('room-title')}</div>

      <input
        type="text"
        placeholder={t('nickname')}
        onChange={(e) => setUsername(e.target.value)}
        style={{ ...inputBase, border: '1.5px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}
      />
      <input
        type="text"
        placeholder={t('room-id')}
        onChange={(e) => setRoom(e.target.value)}
        style={{ ...inputBase, border: '1.5px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}
      />

      <button
        onClick={joinRoom}
        style={{
          width: '100%', padding: '13px 0', marginTop: 6,
          background: 'rgba(0,229,255,0.08)',
          border: '1.5px solid rgba(0,229,255,0.45)',
          borderRadius: 4, color: '#00e5ff',
          fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700,
          letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.16s',
          textTransform: 'uppercase', boxSizing: 'border-box',
          boxShadow: '0 0 16px rgba(0,229,255,0.10)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.18)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.color = '#00e5ff'; }}
      >{t('join-room')}</button>
    </div>
  );
}

export default JoinForm;
