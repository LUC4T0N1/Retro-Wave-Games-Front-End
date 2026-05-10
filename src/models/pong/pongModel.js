export const LW = 800, LH = 480;
export const BALL_R = 8;
export const PAD_W = 14, PAD_H = 92;
export const PAD_MARGIN = 28;
export const WIN_SCORE = 7;
export const INIT_SPEED = 6.5;
export const MAX_SPEED = 16;
export const SPD_PER_HIT = 0.42;
export const COUNTDOWN_SEC = 1.8;
export const PLAYER_SPD = 7.5;
export const MAX_BOUNCE_ANGLE = Math.PI / 3;

export const AI_CFG = {
  easy:   { maxSpd: 2.6,  noise: 42, lagFrames: 14 },
  medium: { maxSpd: 5.0,  noise: 15, lagFrames: 4  },
  hard:   { maxSpd: 9.5,  noise: 3,  lagFrames: 0  },
};

export function newBall(dir) {
  const angle = Math.PI / 9 + Math.random() * (Math.PI / 6);
  const ys = Math.random() < 0.5 ? 1 : -1;
  return {
    x: LW / 2, y: LH / 2, prevX: LW / 2,
    vx: INIT_SPEED * dir * Math.cos(angle),
    vy: INIT_SPEED * ys  * Math.sin(angle),
    spd: INIT_SPEED, hits: 0,
  };
}

export function initState() {
  return {
    ball: newBall(Math.random() < 0.5 ? 1 : -1),
    pY: (LH - PAD_H) / 2,
    aY: (LH - PAD_H) / 2,
    aTarget: LH / 2,
    aLag: 0,
    pScore: 0,
    aScore: 0,
    phase: 'countdown',
    cdown: COUNTDOWN_SEC,
    winner: null,
    tick: 0,
  };
}
