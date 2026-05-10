import { useNavigate } from 'react-router-dom';

const HomeButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      style={{
        position: 'absolute',
        top: 16,
        left: 20,
        zIndex: 60,
        background: 'rgba(4,0,18,0.75)',
        border: '1.5px solid rgba(0,229,255,0.35)',
        color: '#00e5ff',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        padding: '7px 16px',
        borderRadius: 3,
        textTransform: 'uppercase',
        boxShadow: '0 0 10px rgba(0,229,255,0.2)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
        e.currentTarget.style.boxShadow = '0 0 15px rgba(0,229,255,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(4,0,18,0.75)';
        e.currentTarget.style.boxShadow = '0 0 10px rgba(0,229,255,0.2)';
      }}
    >
      ← HOME
    </button>
  );
};

export default HomeButton;
