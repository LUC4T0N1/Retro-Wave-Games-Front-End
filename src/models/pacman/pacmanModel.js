export const COLS = 21;
export const ROWS = 22;

export const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,0,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,0,1,0,0,0,0,0,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,4,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,0,0,0,0,0,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const GHOST_COLORS = ['#ff2222', '#ffb8ff', '#00e5ff', '#ffb852'];
export const EXIT_COL = 10;
export const EXIT_ROW = 6;

export function buildMaze() { return MAZE_TEMPLATE.map(r => [...r]); }
export function countDots(maze) {
  let n = 0;
  maze.forEach(row => row.forEach(v => { if (v === 2 || v === 3) n++; }));
  return n;
}

export function levelConfig(level) {
  const L = Math.min(level, 7);
  const delays = [
    [0, 6, 12, 18], [0, 5,  9, 15], [0, 4,  7, 12],
    [0, 3,  5,  9], [0, 2,  4,  7], [0, 1,  3,  5], [0, 0,  2,  3],
  ][L - 1];
  return {
    pacSpeed:         Math.max(0.11, 0.22 - (L - 1) * 0.016),
    ghostSpeed:       Math.max(0.15, 0.30 - (L - 1) * 0.023),
    frightenDuration: Math.max(3,    9    - (L - 1) * 0.9),
    releaseDelays: delays,
  };
}

export function lp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

export function wrapX(x) { return ((x % COLS) + COLS) % COLS; }
export function canMove(maze, x, y, dx, dy, allowDoor = false) {
  const ny = y + dy, wnx = wrapX(x + dx);
  if (ny < 0 || ny >= ROWS) return false;
  const cell = maze[ny][wnx];
  if (cell === 1) return false;
  if (cell === 4 && !allowDoor) return false;
  return true;
}
