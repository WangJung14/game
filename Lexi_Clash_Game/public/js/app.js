import { socket } from './socketClient.js';
import { renderJoinScreen } from './screens/joinScreen.js';
import { renderLobbyScreen } from './screens/lobbyScreen.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const state = { role: null, roomCode: null, playerId: null, playerTeam: null, players: [], canStart: false };

function showError({ message }) {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 4000);
}

function render() {
  if (!state.roomCode) {
    renderJoinScreen(app, {
      onCreate: () => socket.emit('room:create'),
      onJoin: (payload) => socket.emit('room:join', payload)
    });
    return;
  }
  renderLobbyScreen(app, state, {
    onMovePlayer: (playerId, targetTeam) => socket.emit('lobby:movePlayer', { playerId, targetTeam })
  });
}

socket.on('room:created', ({ roomCode, hostToken }) => {
  state.role = 'host';
  state.roomCode = roomCode;
  localStorage.setItem('lexiHostSession', JSON.stringify({ roomCode, hostToken }));
  render();
});

socket.on('room:joined', ({ roomCode, playerId, playerToken, team }) => {
  state.role = 'player';
  state.roomCode = roomCode;
  state.playerId = playerId;
  state.playerTeam = team;
  sessionStorage.setItem('lexiPlayerSession', JSON.stringify({ roomCode: state.roomCode, playerToken }));
  render();
});

socket.on('lobby:update', ({ players, canStart }) => {
  state.players = players;
  state.canStart = canStart;
  const ownPlayer = players.find((player) => player.playerId === state.playerId);
  if (ownPlayer) state.playerTeam = ownPlayer.team;
  render();
});

socket.on('state:sync', (snapshot) => {
  state.roomCode = snapshot.roomId;
  state.players = snapshot.players;
  state.canStart = snapshot.canStart;
  render();
});

socket.on('error:notice', showError);

const savedPlayer = sessionStorage.getItem('lexiPlayerSession');
if (savedPlayer) {
  try {
    const session = JSON.parse(savedPlayer);
    state.roomCode = session.roomCode;
    socket.emit('room:rejoin', session);
  } catch (_error) {
    sessionStorage.removeItem('lexiPlayerSession');
  }
}

render();
