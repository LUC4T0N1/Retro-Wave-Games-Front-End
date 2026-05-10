import React from 'react';

export default function PacmanMobileControls({ onDirectionChange }) {
  const btnStyle = (color) => ({
    background: 'rgba(4,0,18,0.75)',
    border: `1.5px solid ${color}`,
    borderRadius: 12,
    color: color,
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    boxShadow: `0 0 15px ${color}44`,
    userSelect: 'none',
    touchAction: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.1s active:scale(0.92)'
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
      gap: 12,
      marginTop: 20,
      userSelect: 'none',
      zIndex: 100
    }}>
      {/* Up */}
      <button
        style={btnStyle('#ffee00')}
        onTouchStart={(e) => handleTouch(e, 'ArrowUp')}
        onMouseDown={(e) => onDirectionChange('ArrowUp')}
      >
        ▲
      </button>

      <div style={{ display: 'flex', gap: 32 }}>
        {/* Left */}
        <button
          style={btnStyle('#ffee00')}
          onTouchStart={(e) => handleTouch(e, 'ArrowLeft')}
          onMouseDown={(e) => onDirectionChange('ArrowLeft')}
        >
          ◀
        </button>

        {/* Down */}
        <button
          style={btnStyle('#ffee00')}
          onTouchStart={(e) => handleTouch(e, 'ArrowDown')}
          onMouseDown={(e) => onDirectionChange('ArrowDown')}
        >
          ▼
        </button>

        {/* Right */}
        <button
          style={btnStyle('#ffee00')}
          onTouchStart={(e) => handleTouch(e, 'ArrowRight')}
          onMouseDown={(e) => onDirectionChange('ArrowRight')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
