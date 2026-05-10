export const LW = 800;
export const LH = 270;
export const GROUND_Y = 226;
export const GRAVITY = 0.58;
export const JUMP_VY = -13.8;
export const DJUMP_VY = -11.5;
export const MONKEY_W = 36;
export const MONKEY_H = 52;
export const MONKEY_DW = 52;
export const MONKEY_DH = 28;
export const MONKEY_X = 90;
export const INIT_SPEED = 5;
export const MAX_SPEED = 22;
export const SPEED_RAMP = 0.0018;

export const OBS = {
  cactus_tall:  { w: 22, h: 78, yOff: 0 },
  cactus_short: { w: 42, h: 44, yOff: 0 },
  cactus_pair:  { w: 58, h: 68, yOff: 0 },
  bird:         { w: 46, h: 30, yOff: 32 },
};

export const OBS_KEYS = Object.keys(OBS);

export const makeState = () => ({
  monkey: { y: GROUND_Y - MONKEY_H, vy: 0, onGround: true, ducking: false, jumpsLeft: 2, animTick: 0 },
  obstacles: [],
  score: 0,
  speed: INIT_SPEED,
  dist: 0,
  nextObs: 500,
  status: 'playing',
  tick: 0,
});
