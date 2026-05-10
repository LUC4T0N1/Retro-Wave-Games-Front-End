import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:8080";
const socket = io.connect(SOCKET_URL);

export default socket;
