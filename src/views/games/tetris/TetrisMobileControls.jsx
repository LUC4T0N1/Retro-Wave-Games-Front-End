import React from 'react';

export default function TetrisMobileControls({ onAction, onSoftDropStart, onSoftDropEnd }) {
  const btnStyle = (color) => ({
    background: 'rgba(4,0,18,0.75)',
    border: `1.5px solid ${color}`,
    borderRadius: 8,
    color: color,
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 45,
    height: 45,
    boxShadow: `0 0 12px ${color}55, inset 0 0 8px ${color}33`,
    userSelect: 'none',
    touchAction: 'none',
    outline: 'none',
  });

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 0,
      width: '100%',
      padding: '0 10px',
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center',
      gap: 24,
      alignItems: 'flex-end',
      zIndex: 100,
      pointerEvents: 'none', // Let touches pass through the container to the canvas if needed
    }}>
      {/* Left side: Directionals & Hard Drop */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, pointerEvents: 'auto' }}>
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <button
            style={btnStyle('#00e5ff')}
            onTouchStart={(e) => { e.preventDefault(); onAction('HardDrop'); }}
          >⤓</button>
        </div>
        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <button
            style={btnStyle('#ff2d78')}
            onTouchStart={(e) => { e.preventDefault(); onAction('Left'); }}
          >⇦</button>
        </div>
        <div style={{ gridColumn: '2', gridRow: '2' }}>
          <button
            style={btnStyle('#00ffcc')}
            onTouchStart={(e) => { e.preventDefault(); onSoftDropStart(); }}
            onTouchEnd={(e) => { e.preventDefault(); onSoftDropEnd(); }}
          >⇓</button>
        </div>
        <div style={{ gridColumn: '3', gridRow: '2' }}>
          <button
            style={btnStyle('#ff2d78')}
            onTouchStart={(e) => { e.preventDefault(); onAction('Right'); }}
          >⇨</button>
        </div>
      </div>

      {/* Right side: Hold & Rotate */}
      <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto', marginBottom: 5, alignItems: 'center' }}>
        <button
          style={{ ...btnStyle('#ffe066'), width: 40, height: 40, fontSize: 16 }}
          onTouchStart={(e) => { e.preventDefault(); onAction('Hold'); }}
        >H</button>
        <button
          style={{ ...btnStyle('#c200ff'), width: 56, height: 56, borderRadius: 28, fontSize: 28, paddingBottom: 4 }}
          onTouchStart={(e) => { e.preventDefault(); onAction('Rotate'); }}
        >↻</button>
      </div>
    </div>
  );
}
