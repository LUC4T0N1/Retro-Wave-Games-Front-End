export const COLS = 10;
export const ROWS = 20;
export const COLORS = {
  I: '#00e5ff',
  O: '#ffe066',
  T: '#c200ff',
  S: '#00ffcc',
  Z: '#ff2d78',
  J: '#ff6600',
  L: '#0066ff',
};

export const PIECES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'I' },
  O: { shape: [[1, 1], [1, 1]], color: 'O' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'T' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'S' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'Z' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'J' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'L' },
};

export const PIECE_KEYS = Object.keys(PIECES);
export const SCORE_TABLE = [0, 100, 300, 500, 800];
export const LEVEL_SPEED = [800, 720, 640, 560, 490, 420, 360, 300, 260, 230, 200];

export function rotate(shape) {
  const N = shape.length;
  return shape[0].map((_, c) => shape.map((row, r) => shape[N - 1 - r][c]));
}

export function newBag() {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function fits(board, shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = py + r, nc = px + c;
      if (nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (nr >= 0 && board[nr][nc]) return false;
    }
  }
  return true;
}

export function place(board, shape, px, py, color) {
  const b = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && py + r >= 0) b[py + r][px + c] = color;
  return b;
}

export function clearLines(board) {
  const kept = board.filter(row => row.some(c => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

export function ghostY(board, shape, px, py) {
  let gy = py;
  while (fits(board, shape, px, gy + 1)) gy++;
  return gy;
}

export function spawnPiece(key) {
  const p = PIECES[key];
  return { shape: p.shape, color: p.color, x: Math.floor((COLS - p.shape[0].length) / 2), y: -1 };
}
