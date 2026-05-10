import { useState, useEffect } from "react";
import OnlineGame from "../multiplayer/online/game-logic/OnlineGame";
import { containsProfanity } from '../../../utils/profanity';
import JoinQueueForm from "../multiplayer/online/room-creation/random/join-queue-form/JoinQueueForm";
import "../multiplayer/online/room-creation/RoomCreation.css";
import { useTranslation } from 'react-i18next';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';

function TicTacToeRandomQueue({ socket }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [isOtherPlayerReady, setIsOtherPlayerReady] = useState(false);
  const [error, setError] = useState("");

  const joinRoom = () => {
    if (username === "") { setError(t('name-warning')); return; }
    if (containsProfanity(username)) { setError(t('profanity-warning')); return; }
    setError("");
    socket.emit("join_queue", username);
    setShowChat(true);
  };

  useEffect(() => {
    socket.on("check_online", (data) => {
      socket.emit("ok", username);
    });
    socket.on("game_start", (data) => {
      setIsOtherPlayerReady(true);
      setRoomReady(true);
      setRoom(data);
    });
  }, [socket, room, roomReady]);

  if (showChat && roomReady) {
    return (
      <OnlineGame
        socket={socket}
        username={username}
        room={room}
        isOtherPlayerReady={isOtherPlayerReady}
        setIsOtherPlayerReady={setIsOtherPlayerReady}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <RetroGrid style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.8 }} />

      <HomeButton />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {!showChat ? (
          <>
            <JoinQueueForm setUsername={setUsername} joinRoom={joinRoom} />
            {error && (
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                color: '#ff2d78', letterSpacing: '0.12em',
                textShadow: '0 0 10px #ff2d78', marginTop: 8,
              }}>{error}</div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="retro-waiting-title">{t('waiting-random')}</div>
            <div style={{ marginTop: 18, fontSize: 28, color: '#ff2d78' }}>
              <span className="retro-dot-1"> · </span>
              <span className="retro-dot-2"> · </span>
              <span className="retro-dot-3"> · </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicTacToeRandomQueue;
