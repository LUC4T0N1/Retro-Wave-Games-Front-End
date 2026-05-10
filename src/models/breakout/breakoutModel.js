export const BASE_W = 480;
export const BASE_H = 560;
export const BRICK_COLS = 9;
export const BRICK_GAP = 5;
export const BRICK_H = 18;
export const BRICK_TOP = 70;
export const PADDLE_H = 12;
export const BALL_R = 7;
export const LIVES_START = 3;

export const ROW_COLORS = [
  '#ff00aa', '#ff2d78', '#ff6622', '#ffb852',
  '#ffee00', '#00ffcc', '#00e5ff', '#cc00ff', '#7700ff',
];

export function getBallSpeed(level) { return Math.min(520, 240 + (level - 1) * 32); }
export function getPaddleW(level) { return Math.max(58, 108 - (level - 1) * 6); }
export function getPaddleY() { return BASE_H - 44; }
export function getBrickW() { return (BASE_W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS; }

export function buildBricks(level) {
  const rows = Math.min(3 + level, 9);
  const brickW = getBrickW();
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const hp = r < 2 && level >= 4 ? 2 : 1;
    const color = ROW_COLORS[r % ROW_COLORS.length];
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_GAP + c * (brickW + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        w: brickW, h: BRICK_H,
        hp, maxHp: hp, color, alive: true,
      });
    }
  }
  return bricks;
}

export function buildState(level = 1, score = 0, lives = LIVES_START) {
  const pw = getPaddleW(level);
  const px = BASE_W / 2 - pw / 2;
  const py = getPaddleY();
  return {
    level, score, lives,
    paddle: { x: px, y: py, w: pw, h: PADDLE_H },
    ball: { x: BASE_W / 2, y: py - BALL_R - 1, vx: 0, vy: 0 },
    bricks: buildBricks(level),
    launched: false,
    status: 'idle',
  };
}

export function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }
