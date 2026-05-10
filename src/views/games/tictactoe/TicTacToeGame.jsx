import { useTicTacToe } from "../../../controllers/tictactoe/useTicTacToe";
import SinglePlayerScreen from "../../game/SinglePlayerScreen";

function TicTacToeGame({ ai_type }) {
  const { board, result, chooseSquare, handleRestart } = useTicTacToe(ai_type);

  return (
    <SinglePlayerScreen
      result={result}
      chooseSquare={chooseSquare}
      handleRestart={handleRestart}
      board={board}
    />
  );
}

export default TicTacToeGame;
