export const COLS = 21;
export const ROWS = 21;
export const FOODS_PER_LEVEL = 5;

export const getBest = () => parseInt(localStorage.getItem('snakeBest') || '0');
export const saveBest = (s) => { if (s > getBest()) localStorage.setItem('snakeBest', String(s)); };

export function randomFood(snake) {
  const occ = new Set(snake.map(s => `${s.x},${s.y}`));
  let x, y;
  do { x = Math.floor(Math.random() * COLS); y = Math.floor(Math.random() * ROWS); }
  while (occ.has(`${x},${y}`));
  return { x, y };
}

export function getMoveInterval(level) {
  return Math.max(0.065, 0.13 - (level - 1) * 0.007);
}

export function buildState(level = 1, score = 0) {
  const sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
  const snake = [
    { x: sx, y: sy, prevX: sx, prevY: sy },
    { x: sx - 1, y: sy, prevX: sx - 1, prevY: sy },
    { x: sx - 2, y: sy, prevX: sx - 2, prevY: sy },
  ];
  return {
    snake,
    food: randomFood(snake),
    dir: { dx: 1, dy: 0 },
    nextDir: { dx: 1, dy: 0 },
    dirQueue: [],
    score, best: getBest(), level,
    foodEaten: 0,
    moveAccum: 0,
    moveInterval: getMoveInterval(level),
    status: 'playing',
    lvlFlash: 0,
  };
}

export function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }
