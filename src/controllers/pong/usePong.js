import { useState, useRef, useCallback } from 'react';
import { initState } from '../../models/pong/pongModel';

export function usePong() {
  const stateRef = useRef(null);
  const inputRef = useRef({ up: false, down: false, up2: false, down2: false, touchY: null });
  const [ui, setUi] = useState({ pScore: 0, aScore: 0, phase: 'countdown', winner: null });

  const restart = useCallback(() => {
    stateRef.current = initState();
    setUi({ pScore: 0, aScore: 0, phase: 'countdown', winner: null });
  }, []);

  return {
    stateRef,
    inputRef,
    ui,
    setUi,
    restart,
  };
}
