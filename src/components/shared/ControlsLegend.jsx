import isMobile from '../../utils/isMobile';

/**
 * Reusable bottom-left controls legend panel (desktop only).
 * Props:
 *   controls – Array of [key, label] pairs
 */
export default function ControlsLegend({ controls }) {
  if (isMobile) return null;
  return (
    <div style={{
      position: 'fixed', left: 24, bottom: 24, zIndex: 20,
      background: 'rgba(4, 0, 18, 0.75)',
      border: '1px solid rgba(0, 229, 255, 0.3)',
      borderRadius: 6, padding: '16px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)',
      width: 190,
      animation: 'spFadeUp 0.6s 0.5s both',
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 'bold',
        color: '#ff2d78', marginBottom: 14, textAlign: 'center',
        letterSpacing: '0.2em', textShadow: '0 0 10px #ff2d7888',
      }}>CONTROLS</div>

      {controls.map(([key, label]) => (
        <div key={key + label} style={{
          display: 'flex', justifyContent: 'space-between', gap: 12,
          marginBottom: 8, fontSize: 11,
          fontFamily: "'Orbitron', sans-serif",
          color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em',
        }}>
          <span style={{ color: '#00e5ff', fontWeight: 'bold', textShadow: '0 0 8px #00e5ff88', whiteSpace: 'nowrap' }}>{key}</span>
          <span style={{ textAlign: 'right' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
