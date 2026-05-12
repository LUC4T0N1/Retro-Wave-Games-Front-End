# 🎮 Retro Wave Games — Frontend

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://retro-wave-games.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A classic arcade games platform with a **retro/synthwave** aesthetic, featuring **real-time multiplayer** and full **mobile responsiveness**. All games are rendered via **HTML5 Canvas** with optimized animation loops.

🌐 **Live:** [retro-wave-games.netlify.app](https://retro-wave-games.netlify.app/)

---

## 📋 Table of Contents

- [Games](#-games)
- [General Features](#-general-features)
- [Screens & Navigation](#-screens--navigation)
- [Controls](#-controls)
- [Technologies](#-technologies)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Author](#-author)

---

## 🕹️ Games

### 🐍 Snake
Classic snake game on a 21×21 grid. The snake grows when it eats food and the level increases every 5 foods consumed, gradually speeding up. Personal best is saved in `localStorage`.

| Mode | Description |
|------|-------------|
| **Singleplayer** | Play solo with a level and score system |
| **Friend** | Create a private room and invite a friend |
| **Random** | Join the queue and face a random opponent |

**Controls:** `←↑→↓` or `WASD` · Mobile: virtual D-pad

---

### 🧱 Tetris
Classic Tetris with colored pieces on a 10×20 grid. Features a **hold piece** system, **next piece** preview, level progression and speed scaling (capped at a maximum to keep the game fair).

| Mode | Description |
|------|-------------|
| **Singleplayer** | Play solo with progressive levels |
| **Friend** | Private room with a friend |
| **Random** | Random matchmaking |

**Controls:** `←→` move · `↑` rotate · `↓` soft drop · `Space` hard drop · `C` hold · Mobile: dedicated buttons

---

### 👻 Pac-Man
Classic Pac-Man on a 21×22 maze. Includes ghosts with autonomous movement, power pellets that make ghosts vulnerable, lives system and scoring.

| Mode | Description |
|------|-------------|
| **Singleplayer** | Play solo through the maze |
| **Friend** | Private room with a friend |
| **Random** | Random matchmaking |

**Controls:** `←↑→↓` or `WASD` · Mobile: virtual D-pad

---

### 🏓 Arkanoid / Breakout
Classic Arkanoid with paddle, ball and rows of bricks. Sub-step physics for precise collision detection. Paddle size decreases and ball speed increases each level. Advanced-level bricks have 2 HP.

| Mode | Description |
|------|-------------|
| **Singleplayer** | Clear all bricks across multiple levels |
| **Friend** | Private room — last one alive wins |
| **Random** | Random matchmaking |

**Controls:** `Mouse` or `touch` to move the paddle · `Space` / click to launch the ball

---

### 🏓 Pong
Classic Pong with ball physics. In singleplayer, the AI opponent has three difficulty levels. In multiplayer, two players compete in real time.

| Mode | Description |
|------|-------------|
| **Easy / Medium / Hard** | Play against the AI at three difficulties |
| **Friend** | Private room with a friend |
| **Random** | Random matchmaking |

**Controls:** `W/S` or `Mouse` to move the paddle

---

### 🏃 Infinity Run
Infinite side-scrolling runner with procedurally generated obstacles and a retro grid floor. The character accelerates progressively over time.

| Mode | Description |
|------|-------------|
| **Singleplayer** | Survive as long as possible |
| **Friend** | Private room — whoever lasts longer wins |
| **Random** | Random matchmaking |

**Controls:** `Space` / click / tap to jump

---

### ❌ Tic-Tac-Toe
Tic-Tac-Toe with a **Minimax** AI. Offers the widest range of game modes on the platform.

| Mode | Description |
|------|-------------|
| **Easy** | AI uses inverted Minimax (always lets the player win) |
| **Random** | AI makes random moves |
| **Ultra Hard** | AI uses optimized Minimax (impossible to beat) |
| **Local** | Two players on the same device |
| **Friend** | Private online room |
| **Random online** | Random matchmaking |

**Controls:** click / tap on the desired cell

---

## ✨ General Features

### Real-Time Multiplayer
- Communication via **Socket.IO** with the backend
- **Friend room:** player creates a room and shares the code for a friend to join
- **Random queue:** automatic matchmaking with another available player
- **Real-time chat** during multiplayer matches
- Opponent disconnection detection with on-screen notification
- **Play again** option at the end of each match (both players must confirm)

### Mobile
- Layout automatically adapted for mobile via `isMobile` detection
- Player's board occupies the **full screen width** on mobile
- Opponent's board displayed at a reduced size below the main board
- **Virtual D-pad** for Snake and Pac-Man
- **Action buttons** for Tetris (move, rotate, drop, hold)
- **Touch/drag** control for Breakout
- Top area reserved for the Home button (avoids conflict with notch/status bar)

### Localization
- Supports **English** and **Portuguese**
- Language switch available in the UI
- Translations via `i18next` with automatic browser language detection

### Score & Progress
- Personal best saved in `localStorage` for singleplayer games
- Progressive level system in Snake and Tetris
- In-game leaderboard display

### Retro/Synthwave Aesthetic
- Animated retro grid background (`RetroGrid`)
- Neon color palette (pink, cyan, yellow, purple)
- `Orbitron` and `VT323` fonts for a retro look
- `shadowBlur` glow effects on canvas-drawn elements
- Shaders via `@paper-design/shaders-react`
- UI animations via `framer-motion`

---

## 🖥️ Screens & Navigation

```
/                          → Home (game selection)
│
├── /snake                 → Snake Singleplayer
├── /snake/friend          → Snake — Friend Lobby
├── /snake/random          → Snake — Random Queue
│
├── /tetris                → Tetris Singleplayer
├── /tetris/friend         → Tetris — Friend Lobby
├── /tetris/random         → Tetris — Random Queue
│
├── /pacman                → Pac-Man Singleplayer
├── /pacman/friend         → Pac-Man — Friend Lobby
├── /pacman/random         → Pac-Man — Random Queue
│
├── /breakout              → Breakout Singleplayer
├── /breakout/friend       → Breakout — Friend Lobby
├── /breakout/random       → Breakout — Random Queue
│
├── /pong/:difficulty      → Pong Singleplayer (easy | medium | hard)
├── /pong/friend           → Pong — Friend Lobby
├── /pong/random           → Pong — Random Queue
│
├── /infinity-run          → Infinity Run Singleplayer
├── /infinity-run/friend   → Infinity Run — Friend Lobby
├── /infinity-run/random   → Infinity Run — Random Queue
│
├── /tic-tac-toe/easy      → Tic-Tac-Toe — Easy AI
├── /tic-tac-toe/hard      → Tic-Tac-Toe — Ultra Hard AI
├── /tic-tac-toe/random-ia → Tic-Tac-Toe — Random AI
├── /tic-tac-toe/local     → Tic-Tac-Toe — Local 2 players
├── /tic-tac-toe/friend    → Tic-Tac-Toe — Friend Lobby
├── /tic-tac-toe/random    → Tic-Tac-Toe — Random Queue
│
└── *                      → 404 Error Page
```

### Multiplayer Flow

```
Home → Select Game → Choose "Friend" or "Random"
         │                      │
         │                 Random Queue → wait for opponent → Match
         │
         └── Friend Lobby → Create room (generates code) ──┐
                          → Join room (enter code) ─────────┤
                                                            └── Match
                                                                 │
                                                            Chat + Game
                                                                 │
                                                            End → Play Again?
```

---

## 🎯 Controls

| Game | Desktop | Mobile |
|------|---------|--------|
| Snake | `←↑→↓` / `WASD` | Virtual D-pad |
| Pac-Man | `←↑→↓` / `WASD` | Virtual D-pad |
| Tetris | `←→` move, `↑` rotate, `↓` soft drop, `Space` hard drop, `C` hold | Dedicated buttons |
| Breakout | Mouse to move paddle, `Space` / click to launch | Drag to move paddle, tap to launch |
| Pong | `W/S` or mouse | Touch / drag |
| Infinity Run | `Space` / click | Tap |
| Tic-Tac-Toe | Click on cell | Tap on cell |

---

## 🛠️ Technologies

### Core
| Technology | Version | Purpose |
|---|---|---|
| [React](https://react.dev/) | 18.2 | Main framework |
| [React Router DOM](https://reactrouter.com/) | 6.3 | SPA routing |
| [Socket.IO Client](https://socket.io/) | 4.5 | Real-time multiplayer |
| HTML5 Canvas API | — | Game rendering |

### UI / Animation
| Technology | Version | Purpose |
|---|---|---|
| [Framer Motion](https://www.framer.com/motion/) | 12.38 | UI animations |
| [Font Awesome](https://fontawesome.com/) | 6.1 | Icons |
| [@paper-design/shaders-react](https://shaders.app/) | 0.0.76 | Background shaders |
| [Three.js](https://threejs.org/) | 0.184 | 3D/WebGL rendering |
| [flag-icon-css](https://github.com/lipis/flag-icons) | 4.1.7 | Language flag icons |

### Internationalization
| Technology | Version | Purpose |
|---|---|---|
| [i18next](https://www.i18next.com/) | 21.8 | i18n framework |
| [react-i18next](https://react.i18next.com/) | 11.18 | React integration |
| i18next-browser-languagedetector | 6.1 | Auto language detection |
| i18next-http-backend | 1.4 | Translation file loading |

### Utilities
| Technology | Version | Purpose |
|---|---|---|
| [axios](https://axios-http.com/) | 0.27 | HTTP requests |
| [react-scroll-to-bottom](https://github.com/compulim/react-scroll-to-bottom) | 4.1 | Auto-scroll in chat |
| [react-beforeunload](https://github.com/jacobbuck/react-beforeunload) | 2.5 | Warn before closing tab mid-match |

### Build
| Technology | Purpose |
|---|---|
| [Create React App](https://create-react-app.dev/) (`react-scripts`) | Bundler and build toolchain |

---

## 📁 Project Structure

```
src/
├── index.js                        # Entry point: initializes i18n and Socket.IO
├── App.jsx                         # Main routing (React Router)
├── App.css
│
├── services/
│   └── socket.js                   # Global Socket.IO instance
│
├── utils/
│   ├── isMobile.js                 # Mobile device detection
│   └── profanity.js                # Chat profanity filter
│
├── components/
│   └── shared/
│       ├── HomeButton.jsx          # Back-to-home navigation button
│       ├── RetroGrid.jsx           # Animated retro background grid
│       ├── Leaderboard.jsx         # Score leaderboard display
│       └── ControlsLegend.jsx      # Controls reference overlay
│
├── models/                         # Pure game logic (no React)
│   ├── snake/snakeModel.js
│   ├── tetris/tetrisModel.js
│   ├── pacman/pacmanModel.js
│   ├── breakout/breakoutModel.js
│   ├── pong/pongModel.js
│   ├── infinityrun/infinityRunModel.js
│   └── tictactoe/
│       ├── AILogic.js              # Minimax algorithm
│       └── EndGame.js              # Win condition checker
│
├── controllers/                    # Custom hooks for game state
│   ├── snake/useSnake.js
│   ├── tetris/useTetris.js
│   ├── pacman/usePacman.js
│   ├── breakout/useBreakout.js
│   ├── pong/usePong.js
│   ├── infinityrun/useInfinityRun.js
│   └── tictactoe/useTicTacToe.js
│
└── views/
    ├── home/Home.jsx               # Landing screen with game selection
    ├── error/Error.jsx             # 404 page
    ├── chat/Chat.jsx               # Multiplayer chat component
    │
    └── games/
        ├── snake/
        │   ├── SnakeGame.jsx               # Singleplayer
        │   ├── OnlineSnakeGame.jsx         # Multiplayer (canvas)
        │   ├── SnakeFriendLobby.jsx        # Private room lobby
        │   ├── SnakeRandomQueue.jsx        # Random queue
        │   └── SnakeMobileControls.jsx     # Mobile D-pad
        │
        ├── tetris/
        │   ├── TetrisGame.jsx
        │   ├── OnlineTetrisGame.jsx
        │   ├── TetrisFriendLobby.jsx
        │   ├── TetrisRandomQueue.jsx
        │   ├── TetrisMobileControls.jsx
        │   └── DesktopControls.jsx
        │
        ├── pacman/
        │   ├── PacmanGame.jsx
        │   ├── OnlinePacmanGame.jsx
        │   ├── PacmanFriendLobby.jsx
        │   ├── PacmanRandomQueue.jsx
        │   └── PacmanMobileControls.jsx
        │
        ├── breakout/
        │   ├── BreakoutGame.jsx
        │   ├── OnlineBreakoutGame.jsx
        │   ├── BreakoutFriendLobby.jsx
        │   └── BreakoutRandomQueue.jsx
        │
        ├── pong/
        │   ├── PongGame.jsx
        │   ├── OnlinePongGame.jsx
        │   ├── PongFriendLobby.jsx
        │   └── PongRandomQueue.jsx
        │
        ├── infinityrun/
        │   ├── InfinityRunGame.jsx
        │   ├── OnlineInfinityRunGame.jsx
        │   ├── InfinityRunFriendLobby.jsx
        │   └── InfinityRunRandomQueue.jsx
        │
        └── tictactoe/
            ├── TicTacToeGame.jsx           # vs AI
            ├── TicTacToeLocalGame.jsx      # Local 2-player
            ├── TicTacToeFriendLobby.jsx
            └── TicTacToeRandomQueue.jsx

public/
└── assets/
    └── locales/
        ├── en/translation.json     # English translations
        └── pt/translation.json     # Portuguese translations
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 16+
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Backend running (see the [backend repository](https://github.com/LUC4T0N1/AI-Tic-Tac-Toe-Back-End))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/LUC4T0N1/Retro-Wave-Games-Front-End
cd Retro-Wave-Games-Front-End

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Create a .env file (see section below)

# 4. Start the development server
npm start
```

The app will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

Output is generated in the `build/` folder, ready to deploy on any static file host (Netlify, Vercel, GitHub Pages, etc.).

---

## 🔧 Environment Variables

Create a `.env` file at the root of the frontend project:

```env
# Backend server URL (Socket.IO + API)
REACT_APP_SERVER_URL=http://localhost:8080

# Production example:
# REACT_APP_SERVER_URL=https://your-backend.onrender.com
```

| Variable | Description | Example |
|---|---|---|
| `REACT_APP_SERVER_URL` | Base URL of the backend server | `http://localhost:8080` |

---

## 👤 Author

**Lucas Moniz de Arruda**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/lucas-moniz-de-arruda/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/LUC4T0N1)
