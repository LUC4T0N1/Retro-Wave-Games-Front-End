import React from 'react';

export default function SnakeMobileControls({ onDirectionChange }) {
  const btnStyle = (color) => ({
    background: 'rgba(4,0,18,0.75)',
    border: `1.5px solid ${color}`,
    borderRadius: 8,
    color: color,
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    boxShadow: `0 0 10px ${color}55`,
    userSelect: 'none',
    touchAction: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.1s'
  });

  const handleAction = (e, direction) => {
    if (e.type === 'touchstart') e.preventDefault();
    onDirectionChange(direction);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      marginTop: 20,
      userSelect: 'none',
      zIndex: 100
    }}>
      {/* Up */}
      <button
        style={btnStyle('#00ffcc')}
        onTouchStart={(e) => handleAction(e, 'ArrowUp')}
        onMouseDown={(e) => handleAction(e, 'ArrowUp')}
      >
        ▲
      </button>

      <div style={{ display: 'flex', gap: 30 }}>
        {/* Left */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleAction(e, 'ArrowLeft')}
          onMouseDown={(e) => handleAction(e, 'ArrowLeft')}
        >
          ◀
        </button>

        {/* Down */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleAction(e, 'ArrowDown')}
          onMouseDown={(e) => handleAction(e, 'ArrowDown')}
        >
          ▼
        </button>

        {/* Right */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleAction(e, 'ArrowRight')}
          onMouseDown={(e) => handleAction(e, 'ArrowRight')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
