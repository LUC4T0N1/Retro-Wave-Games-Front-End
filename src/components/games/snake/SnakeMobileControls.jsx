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

  const handleTouch = (e, direction) => {
    e.preventDefault();
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
        onTouchStart={(e) => handleTouch(e, 'ArrowUp')}
        onMouseDown={(e) => onDirectionChange('ArrowUp')}
      >
        ▲
      </button>

      <div style={{ display: 'flex', gap: 30 }}>
        {/* Left */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleTouch(e, 'ArrowLeft')}
          onMouseDown={(e) => onDirectionChange('ArrowLeft')}
        >
          ◀
        </button>

        {/* Down */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleTouch(e, 'ArrowDown')}
          onMouseDown={(e) => onDirectionChange('ArrowDown')}
        >
          ▼
        </button>

        {/* Right */}
        <button
          style={btnStyle('#00ffcc')}
          onTouchStart={(e) => handleTouch(e, 'ArrowRight')}
          onMouseDown={(e) => onDirectionChange('ArrowRight')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
