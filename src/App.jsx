import "./App.css";
import { lazy, Suspense } from 'react';
import Home from "./components/home/Home";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const Error = lazy(() => import("./components/error/Error"));
const TicTacToeGame        = lazy(() => import("./components/games/tictactoe/TicTacToeGame"));
const TicTacToeLocalGame   = lazy(() => import("./components/games/tictactoe/TicTacToeLocalGame"));
const TicTacToeFriendLobby = lazy(() => import("./components/games/tictactoe/TicTacToeFriendLobby"));
const TicTacToeRandomQueue = lazy(() => import("./components/games/tictactoe/TicTacToeRandomQueue"));
const PacmanGame        = lazy(() => import("./components/games/pacman/PacmanGame"));
const PacmanFriendLobby = lazy(() => import("./components/games/pacman/PacmanFriendLobby"));
const PacmanRandomQueue = lazy(() => import("./components/games/pacman/PacmanRandomQueue"));
const SnakeGame  = lazy(() => import("./components/games/snake/SnakeGame"));
const SnakeFriendLobby = lazy(() => import("./components/games/snake/SnakeFriendLobby"));
const SnakeRandomQueue = lazy(() => import("./components/games/snake/SnakeRandomQueue"));
const BreakoutGame = lazy(() => import("./components/games/breakout/BreakoutGame"));
const BreakoutFriendLobby = lazy(() => import("./components/games/breakout/BreakoutFriendLobby"));
const BreakoutRandomQueue = lazy(() => import("./components/games/breakout/BreakoutRandomQueue"));
const TetrisGame        = lazy(() => import("./components/games/tetris/TetrisGame"));
const TetrisFriendLobby = lazy(() => import("./components/games/tetris/TetrisFriendLobby"));
const TetrisRandomQueue = lazy(() => import("./components/games/tetris/TetrisRandomQueue"));
const InfinityRunGame        = lazy(() => import("./components/games/infinityrun/InfinityRunGame"));
const InfinityRunFriendLobby = lazy(() => import("./components/games/infinityrun/InfinityRunFriendLobby"));
const InfinityRunRandomQueue = lazy(() => import("./components/games/infinityrun/InfinityRunRandomQueue"));
const PongGame        = lazy(() => import("./components/games/pong/PongGame"));
const PongFriendLobby = lazy(() => import("./components/games/pong/PongFriendLobby"));
const PongRandomQueue = lazy(() => import("./components/games/pong/PongRandomQueue"));

const LoadingFallback = () => (
  <div style={{ width: '100vw', height: '100vh', background: '#050010' }} />
);

function App({ socket }) {
  return (
    <div className="App" style={{ backgroundColor: "#050010", color: "white" }}>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home socket={socket} />} />
            <Route path="/tic-tac-toe/easy" element={<TicTacToeGame ai_type={2} />} />
            <Route path="/tic-tac-toe/hard" element={<TicTacToeGame ai_type={1} />} />
            <Route path="/tic-tac-toe/random-ia" element={<TicTacToeGame ai_type={3} />} />
            <Route path="/tic-tac-toe/local" element={<TicTacToeLocalGame />} />
            <Route path="/tic-tac-toe/friend" element={<TicTacToeFriendLobby socket={socket} />} />
            <Route path="/tic-tac-toe/random" element={<TicTacToeRandomQueue socket={socket} />} />
            <Route path="/pacman"        element={<PacmanGame />} />
            <Route path="/pacman/friend" element={<PacmanFriendLobby socket={socket} />} />
            <Route path="/pacman/random" element={<PacmanRandomQueue socket={socket} />} />
            <Route path="/snake"  element={<SnakeGame />} />
            <Route path="/snake/friend" element={<SnakeFriendLobby socket={socket} />} />
            <Route path="/snake/random" element={<SnakeRandomQueue socket={socket} />} />
            <Route path="/breakout" element={<BreakoutGame />} />
            <Route path="/breakout/friend" element={<BreakoutFriendLobby socket={socket} />} />
            <Route path="/breakout/random" element={<BreakoutRandomQueue socket={socket} />} />
            <Route path="/tetris"        element={<TetrisGame />} />
            <Route path="/tetris/friend" element={<TetrisFriendLobby socket={socket} />} />
            <Route path="/tetris/random" element={<TetrisRandomQueue socket={socket} />} />
            <Route path="/infinity-run"        element={<InfinityRunGame />} />
            <Route path="/infinity-run/friend" element={<InfinityRunFriendLobby socket={socket} />} />
            <Route path="/infinity-run/random" element={<InfinityRunRandomQueue socket={socket} />} />
            <Route path="/pong/friend"      element={<PongFriendLobby socket={socket} />} />
            <Route path="/pong/random"      element={<PongRandomQueue socket={socket} />} />
            <Route path="/pong/:difficulty" element={<PongGame />} />
            <Route path='*' element={<Error />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

export default App;
