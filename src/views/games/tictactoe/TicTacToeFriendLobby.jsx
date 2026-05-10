import { useState, useEffect } from "react";
import OnlineGame from "../multiplayer/online/game-logic/OnlineGame";
import { containsProfanity } from '../../../utils/profanity';
import JoinForm from "../multiplayer/online/room-creation/friend/join-friend-form/JoinFriendForm";
import "../multiplayer/online/room-creation/RoomCreation.css";
import { useTranslation } from 'react-i18next';
import HomeButton from '../../../components/shared/HomeButton';
import RetroGrid from '../../../components/shared/RetroGrid';

function TicTacToeFriendLobby({ socket }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isOtherPlayerReady, setIsOtherPlayerReady] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [rightRoomName, setRightRoomName] = useState(true);
  const [rightUserName, setRightUserName] = useState(true);
  const [profanityError, setProfanityError] = useState(false);

  const joinRoom = async () => {
    if (username === "") {
      setRightUserName(false);
      setProfanityError(false);
    } else {
      setRightUserName(true);
      if (containsProfanity(username)) {
        setProfanityError(true);
        return;
      }
      setProfanityError(false);
      if (!containsAnyLetter(room)) {
        setRightRoomName(false);
      } else {
        setRightRoomName(true);
        await socket.emit("join_room", room);
        setShowChat(true);
      }
    }
  };

  function containsAnyLetter(str) {
    return /[a-zA-Z]/.test(str);
  }

  useEffect(() => {
    socket.on("room-ready", async (data) => {
      setIsOtherPlayerReady(true);
      setRoomReady(true);
    });
  }, [socket, room, roomReady, isOtherPlayerReady]);

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
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        {!showChat ? (
          <>
            <JoinForm setUsername={setUsername} setRoom={setRoom} joinRoom={joinRoom} />
            {!rightRoomName && (
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                color: '#ff2d78', letterSpacing: '0.12em',
                textShadow: '0 0 10px #ff2d78',
              }}>{t('id-warning')}</div>
            )}
            {!rightUserName && (
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                color: '#ff2d78', letterSpacing: '0.12em',
                textShadow: '0 0 10px #ff2d78',
              }}>{t('name-warning')}</div>
            )}
            {profanityError && (
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                color: '#ff2d78', letterSpacing: '0.12em',
                textShadow: '0 0 10px #ff2d78',
              }}>{t('profanity-warning')}</div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="retro-waiting-title">{t('waiting-friend')}</div>
            <div style={{ marginTop: 18, fontSize: 28 }}>
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

export default TicTacToeFriendLobby;
