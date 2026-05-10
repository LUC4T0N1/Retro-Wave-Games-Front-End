import {Patterns} from './EndGame'

function checkGameOver({board}) {
  let score = 0;
  Patterns.forEach((currPattern) => {
    const firstPlayer = board[currPattern[0]];
    if (firstPlayer === "") return 0;
    let foundWinningPattern = true;
    currPattern.forEach((idx) => {
      if (board[idx] !== firstPlayer) {
        foundWinningPattern = false;
      }
    });

    if (foundWinningPattern) {
      if(board[currPattern[0]] === 'O'){
        score = 10;
      }else{
        score = -10;
      }
    }
  });
  return score;
}

function isMovesLeft(board) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') {
      return true;
    } 
  }
   return false; 
}
 
function minimax(board, depth, isMax, player) {
    let score = null;
    score = checkGameOver({board});

    if (score === 10 || score === -10){
        return score;
    }
    if (isMovesLeft(board)===false){
        return 0;
    }

    if (isMax) {
        let best = -1000;
        board.forEach((val, idx) => {
                if (val==='') {
                    board[idx] = player;
                    best = Math.max(best, minimax(board, depth + 1, !isMax, player));
                    board[idx] = '';
                }
            })
        return best;
    }
    else {
        let best = 1000;
        board.forEach((val, idx) => {
                if (board[idx] === '')
                {
                    if (player === 'X'){
                      board[idx] = 'O';
                    }else{
                      board[idx] = 'X';
                    }
                    best = Math.min(best, minimax(board, depth + 1, !isMax, player));
                    board[idx] = '';
                }
            
        })
        return best;
    }
}
 
export function findBestMove({board, player}) {
    let bestVal = -1000;
    let bestMove = -1;
    board.forEach((val, idx) => {
          if (val === "") { 
            board[idx] = player;
            let moveVal = minimax(board, 0, false, player);
            board[idx] = '';  
            if (moveVal > bestVal) {
                bestMove = idx;
                bestVal = moveVal;
            }
        }
    })
    return bestMove;
}

export function findWorstMove({board, player}) {
    let bestVal = 1000;
    let bestMove = 1;
    board.forEach((val, idx) => {
          if (val === "") { 
            board[idx] = player;
            let moveVal = minimax(board, 0, false, player);
            board[idx] = '';  
            if (moveVal < bestVal) {
                bestMove = idx;
                bestVal = moveVal;
            }
        }
    })
    return bestMove;
}

export const findRandomMove = ({board}) => {
  let b = []
  board.forEach((val, idx) => {
     if (val === "") {
        b.push(idx)
      }
  })
  const random = Math.floor(Math.random() * b.length);
  return b[random];
}