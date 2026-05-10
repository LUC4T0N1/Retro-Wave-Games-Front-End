import {useEffect ,useState} from "react";
import {checkIfTie, checkWin} from  "../../../utils/EndGame";
import {findBestMove, findWorstMove, findRandomMove} from  "../../../utils/AILogic";
import SinglePlayerScreen from "../../game/SinglePlayerScreen";

function TicTacToeGame({ai_type}) {
  const [board, setBoard] = useState(["","","","","","","","",""])
  const [player, setPlayer] = useState("X");
  const [turn, setTurn] = useState("X");
  const [result, setResult] = useState({ winner: "none", state: "none" });

  const handleGameOver = ({winner, state}) => {
    setResult({ winner: winner, state: state });
    setTurn("X");
  }

  const delay = ms => new Promise(res => setTimeout(res, ms));

  useEffect(() =>  {
    let win = false
    checkIfTie({board, handleGameOver});
    win = checkWin({board, handleGameOver});
    if(turn === "O" && win !== true){
      handleAITurn();
    }
}, [board]);

const handleRestart = () => {
  setBoard(["","","","","","","","",""]);
  setPlayer("X");
  setResult({ winner: "none", state: "none" });
}

const handleAITurn = async () => {
  await delay(850);
  if(turn === "O" && result.state === "none"){
    let square = null;
      if(ai_type === 1) {
        square = findBestMove({board, player});
      }else if(ai_type === 2){
        square = findWorstMove({board, player});
      }else{
        square = findRandomMove({board});
      }
      const currentPlayer = player === "O" ? "X" : "O";
      setPlayer(currentPlayer);
      setBoard(
      board.map((val, idx) => {
          if (idx === square && val === "") {
          return player;
        }
        return val;
      })
      );
      setTurn("X")
    }
}


  const chooseSquare = (square) => {
    if(turn === "X" && result.state === "none"){
      const currentPlayer = player === "X" ? "O" : "X";
      setPlayer(currentPlayer);
      setBoard(
        board.map((val, idx) => {
          if (idx === square && val === "") {
            setTurn("O")
            return player;
          }
          return val;
        })
      );

    }
  };

  return (
   <SinglePlayerScreen result={result} chooseSquare={chooseSquare} handleRestart={handleRestart} board={board}/>
  )
}

export default TicTacToeGame
