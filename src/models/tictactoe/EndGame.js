export const checkIfTie = ({board, handleGameOver}) => {
  let filled = true;
  board.forEach((square) => {
    if (square === "") {
      filled = false;
    }
  });

  if (filled) {
    handleGameOver({ winner: "none", state: "tie" });
  }
};

export const checkWin = ({board, handleGameOver}) => {
  let fim = false
  Patterns.forEach((currPattern) => {
    const firstPlayer = board[currPattern[0]];
    if (firstPlayer === "") return fim;
    let foundWinningPattern = true;
    currPattern.forEach((idx) => {
      if (board[idx] !== firstPlayer) {
        foundWinningPattern = false;
      }
    });

    if (foundWinningPattern) {
      handleGameOver({ winner: board[currPattern[0]], state: "won"});
      fim = true;
    }
  });
  return fim;
};

export const Patterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];