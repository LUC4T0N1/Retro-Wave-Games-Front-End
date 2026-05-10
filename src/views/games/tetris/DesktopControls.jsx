import isMobile from '../../../utils/isMobile';

export default function DesktopControls({ t }) {
  if (isMobile) return null;
  
  const controlStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '11px',
    fontFamily: "'Orbitron', sans-serif",
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: '0.05em'
  };
  
  const keyStyle = {
    color: '#00e5ff',
    fontWeight: 'bold',
    textShadow: '0 0 8px #00e5ff88'
  };

  return (
    <div style={{
      position: 'fixed',
      left: '24px',
      bottom: '24px',
      zIndex: 20,
      background: 'rgba(4, 0, 18, 0.75)',
      border: '1px solid rgba(0, 229, 255, 0.3)',
      borderRadius: '6px',
      padding: '16px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      animation: 'spFadeUp 0.6s 0.5s both',
      width: '180px'
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#ff2d78',
        marginBottom: '14px',
        textAlign: 'center',
        letterSpacing: '0.2em',
        textShadow: '0 0 10px #ff2d7888'
      }}>{t('controls')}</div>
      
      <div style={controlStyle}><span style={keyStyle}>← →</span> <span>{t('move')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>↓</span> <span>{t('soft-drop')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>SPACE</span> <span>{t('hard-drop')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>↑ / X</span> <span>{t('rotate-right')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>Z</span> <span>{t('rotate-left')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>C / SHIFT</span> <span>{t('hold')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>P / ESC</span> <span>{t('pause')}</span></div>
      <div style={controlStyle}><span style={keyStyle}>R</span> <span>{t('restart')}</span></div>
    </div>
  );
}
