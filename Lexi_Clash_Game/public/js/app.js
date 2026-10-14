import { socket } from './socketClient.js';
import { renderJoinScreen } from './screens/joinScreen.js';
import { renderLobbyScreen } from './screens/lobbyScreen.js';
import { renderQuestionScreen } from './screens/questionScreen.js';
import { renderRevealScreen } from './screens/revealScreen.js';
import { renderResultsScreen } from './screens/resultsScreen.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const state = {
  screen: 'join', role: null, roomCode: null, playerId: null, playerTeam: null,
  players: [], canStart: false, question: null, roundResult: null, personalRound: null,
  gameResult: null, personalResult: null, teamScores: null, submitted: false,
  submissionCount: { submitted: 0, total: 0 }, countdownEndsAt: null, paused: false
};
let countdownTimer = null;

function showError({ message }) {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 4000);
}

function setScreen(screen) {
  state.screen = screen;
  render();
}

function renderCountdown() {
  window.clearInterval(countdownTimer);
  const update = () => {
    const seconds = Math.max(0, Math.ceil((state.countdownEndsAt - Date.now()) / 1000));
    app.innerHTML = `<section class="center-screen"><p class="eyebrow">Trận đấu sắp bắt đầu</p><div class="countdown">${seconds || 'GO!'}</div><p>Chuẩn bị cùng đội của bạn!</p></section>`;
  };
  update();
  countdownTimer = window.setInterval(update, 200);
}

function render() {
  window.clearInterval(countdownTimer);
  if (state.paused) {
    app.innerHTML = '<section class="center-screen"><div class="status-icon">⏸</div><h1>Trận đấu đang tạm dừng</h1><p>Đang chờ giáo viên kết nối lại…</p></section>';
    return;
  }
  if (state.screen === 'join') {
    renderJoinScreen(app, { onCreate: () => socket.emit('room:create'), onJoin: (payload) => socket.emit('room:join', payload) });
  } else if (state.screen === 'lobby') {
    renderLobbyScreen(app, state, {
      onMovePlayer: (playerId, targetTeam) => socket.emit('lobby:movePlayer', { playerId, targetTeam }),
      onStart: () => socket.emit('game:start')
    });
  } else if (state.screen === 'countdown') {
    renderCountdown();
  } else if (state.screen === 'question') {
    renderQuestionScreen(app, state, {
      onSubmit: (answer) => {
        if (state.submitted) return;
        socket.emit('answer:submit', { questionId: state.question.questionId, answer });
      }
    });
  } else if (state.screen === 'reveal') {
    renderRevealScreen(app, state, { onNext: () => socket.emit('game:nextQuestion') });
  } else if (state.screen === 'results') {
    renderResultsScreen(app, state, {
      onRestart: () => socket.emit('game:restart'),
      onClose: () => socket.emit('room:close')
    });
  }
}

socket.on('connect', () => document.body.classList.remove('disconnected'));
socket.on('disconnect', () => {
  document.body.classList.add('disconnected');
  showError({ message: 'Mất kết nối. Đang thử kết nối lại…' });
});

socket.on('room:created', ({ roomCode, hostToken }) => {
  state.role = 'host';
  state.roomCode = roomCode;
  localStorage.setItem('lexiHostSession', JSON.stringify({ roomCode, hostToken }));
  setScreen('lobby');
});

socket.on('room:joined', ({ roomCode, playerId, playerToken, team }) => {
  state.role = 'player';
  state.roomCode = roomCode;
  state.playerId = playerId;
  state.playerTeam = team;
  sessionStorage.setItem('lexiPlayerSession', JSON.stringify({ roomCode, playerToken }));
  if (state.screen === 'join') setScreen('lobby');
});

socket.on('lobby:update', ({ players, canStart }) => {
  state.players = players;
  state.canStart = canStart;
  const ownPlayer = players.find((player) => player.playerId === state.playerId);
  if (ownPlayer) state.playerTeam = ownPlayer.team;
  if (state.screen === 'lobby') render();
});

socket.on('game:countdown', ({ endsAt }) => {
  state.countdownEndsAt = endsAt;
  setScreen('countdown');
});

socket.on('question:show', (question) => {
  state.question = question;
  state.submitted = false;
  state.personalRound = null;
  state.submissionCount = { submitted: 0, total: state.players.filter((player) => player.isConnected).length };
  setScreen('question');
});

socket.on('answer:ack', () => {
  state.submitted = true;
  render();
});

socket.on('round:submissionCount', (counts) => {
  state.submissionCount = counts;
  if (state.screen === 'question') render();
});

socket.on('round:result', (result) => {
  state.roundResult = result;
  state.teamScores = result.teamScores;
  setScreen('reveal');
});

socket.on('round:personal', (result) => {
  state.personalRound = result;
  if (state.screen === 'reveal') render();
});

socket.on('game:over', (result) => {
  state.gameResult = result;
  state.teamScores = result.teamScores;
  setScreen('results');
});

socket.on('game:personal', (result) => {
  state.personalResult = result;
  if (state.screen === 'results') render();
});

socket.on('game:restarted', () => {
  Object.assign(state, { question: null, roundResult: null, personalRound: null, gameResult: null, personalResult: null, teamScores: null, submitted: false });
  setScreen('lobby');
});

socket.on('room:paused', () => { state.paused = true; render(); });
socket.on('room:resumed', () => { state.paused = false; render(); });
socket.on('room:closed', () => {
  localStorage.removeItem('lexiHostSession');
  sessionStorage.removeItem('lexiPlayerSession');
  Object.assign(state, { screen: 'join', roomCode: null, playerId: null, role: null, paused: false });
  showError({ message: 'Phòng đã đóng.' });
  render();
});

socket.on('state:sync', (snapshot) => {
  state.roomCode = snapshot.roomId;
  state.players = snapshot.players;
  state.canStart = snapshot.canStart;
  if (!snapshot.game) setScreen('lobby');
  else if (snapshot.game.state === 'COUNTDOWN') {
    state.countdownEndsAt = snapshot.game.endsAt;
    setScreen('countdown');
  } else if (snapshot.game.state === 'QUESTION_ACTIVE') {
    state.question = snapshot.game.question;
    state.teamScores = snapshot.game.teamScores;
    setScreen('question');
  } else if (snapshot.game.state === 'ROUND_RESULT') {
    state.roundResult = snapshot.game.roundResult;
    state.personalRound = snapshot.game.playerRoundResult;
    setScreen('reveal');
  } else if (snapshot.game.state === 'FINISHED') {
    state.gameResult = snapshot.game.gameResult;
    state.personalResult = snapshot.game.personalResult;
    setScreen('results');
  }
});

socket.on('error:notice', showError);

const savedPlayer = sessionStorage.getItem('lexiPlayerSession');
const savedHost = localStorage.getItem('lexiHostSession');
if (savedPlayer) {
  try {
    const session = JSON.parse(savedPlayer);
    state.roomCode = session.roomCode;
    socket.emit('room:rejoin', session);
  } catch (_error) {
    sessionStorage.removeItem('lexiPlayerSession');
  }
} else if (savedHost) {
  try {
    const session = JSON.parse(savedHost);
    state.roomCode = session.roomCode;
    socket.emit('room:hostRejoin', session);
  } catch (_error) {
    localStorage.removeItem('lexiHostSession');
  }
}

render();
