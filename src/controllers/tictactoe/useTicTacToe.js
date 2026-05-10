import { useState, useEffect, useCallback } from "react";
import { checkIfTie, checkWin } from "../../models/tictactoe/EndGame";
import { findBestMove, findWorstMove, findRandomMove } from "../../models/tictactoe/AILogic";

const INITIAL_BOARD = ["", "", "", "", "", "", "", "", ""];

export function useTicTacToe(ai_type) {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [player, setPlayer] = useState("X");
  const [turn, setTurn] = useState("X");
  const [result, setResult] = useState({ winner: "none", state: "none" });

  const handleGameOver = useCallback(({ winner, state }) => {
    setResult({ winner, state });
    setTurn("X");
  }, []);

  const handleRestart = useCallback(() => {
    setBoard(INITIAL_BOARD);
    setPlayer("X");
    setTurn("X");
    setResult({ winner: "none", state: "none" });
  }, []);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleAITurn = useCallback(async () => {
    await delay(850);
    if (turn === "O" && result.state === "none") {
      let square = null;
      if (ai_type === 1) {
        square = findBestMove({ board, player });
      } else if (ai_type === 2) {
        square = findWorstMove({ board, player });
      } else {
        square = findRandomMove({ board });
      }

      if (square !== null && square !== -1) {
        const currentPlayer = player === "O" ? "X" : "O";
        setPlayer(currentPlayer);
        setBoard((prev) =>
          prev.map((val, idx) => {
            if (idx === square && val === "") {
              return player;
            }
            return val;
          })
        );
        setTurn("X");
      }
    }
  }, [ai_type, board, player, result.state, turn]);

  useEffect(() => {
    let win = false;
    checkIfTie({ board, handleGameOver });
    win = checkWin({ board, handleGameOver });
    if (turn === "O" && win !== true && result.state === "none") {
      handleAITurn();
    }
  }, [board, handleAITurn, handleGameOver, result.state, turn]);

  const chooseSquare = (square) => {
    if (turn === "X" && result.state === "none" && board[square] === "") {
      const currentPlayer = player === "X" ? "O" : "X";
      setPlayer(currentPlayer);
      setBoard((prev) =>
        prev.map((val, idx) => {
          if (idx === square && val === "") {
            setTurn("O");
            return player;
          }
          return val;
        })
      );
    }
  };

  return {
    board,
    player,
    turn,
    result,
    chooseSquare,
    handleRestart,
  };
}
