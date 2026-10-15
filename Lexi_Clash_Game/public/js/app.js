import { socket } from './socketClient.js';
import { renderJoinScreen } from './screens/joinScreen.js';
import { renderLobbyScreen } from './screens/lobbyScreen.js';
import { renderQuestionScreen, updateSubmissionStatus } from './screens/questionScreen.js';
import { mascot } from './ui.js';
import { renderRevealScreen } from './screens/revealScreen.js';
import { renderResultsScreen } from './screens/resultsScreen.js';
import { clearVfx, playBossEntrance, playCorrectAnswer, playCountdown, playLeadChange, playVictory } from './vfx.js';
import {
  clearQuestionAudio, closeAudio, enableLandingMusic, enableRoomMusic, initAudioControls, playSfx, scheduleQuestionAudio,
  setAudioContext, startCountdownAudio, stopCountdownAudio
} from './audio.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const state = {
  screen: 'join', role: null, roomCode: null, playerId: null, playerTeam: null,
  players: [], canStart: false, question: null, roundResult: null, personalRound: null,
  gameResult: null, personalResult: null, teamScores: null, submitted: false,
  submissionCount: { submitted: 0, total: 0 }, countdownEndsAt: null, paused: false,
  questionSet: { source: 'demo', title: 'Bộ câu hỏi mẫu', count: 8 }, importingQuestions: false,
  librarySets: [], editorSetId: null, editorTitle: '', editorJson: '', editorQuestions: []
};
let countdownTimer = null;
let disposeScreen = () => {};
let toastTimer;
let requestTimer;
state.pending = false;
state.selectedAnswer = null;

function request(event, payload) {
  if (!socket.connected) return showError({ message: 'Đang mất kết nối. Hãy chờ kết nối lại rồi thử lại.' });
  app.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  app.setAttribute('aria-busy', 'true');
  socket.emit(event, payload);
  window.clearTimeout(requestTimer);
  requestTimer = window.setTimeout(() => {
    showError({ message: 'Chưa nhận được phản hồi. Kiểm tra kết nối rồi thử lại.' });
    render();
  }, 8000);
}

function showError({ message, code }) {
  const messages = { ROOM_NOT_FOUND: 'Không tìm thấy phòng. Kiểm tra lại mã với giáo viên.', ROOM_FULL: 'Phòng đã đủ người. Nhờ giáo viên tạo phòng khác.', INVALID_NAME: 'Tên cần từ 2 đến 16 ký tự.', TOKEN_INVALID: 'Phiên tham gia đã hết hạn. Hãy nhập lại mã phòng.', REJOIN_EXPIRED: 'Đã quá thời gian kết nối lại. Hãy tham gia lại phòng.', ROOM_FINISHED: 'Trận đấu đã kết thúc. Chờ giáo viên mở trận mới.', ALREADY_ANSWERED: 'Đáp án của bạn đã được ghi nhận.', NOT_ELIGIBLE: 'Bạn sẽ được trả lời từ vòng tiếp theo.' };
  window.clearTimeout(requestTimer);
  app.removeAttribute('aria-busy');
  if (state.pending) {
    state.pending = false;
    if (code === 'ALREADY_ANSWERED') state.submitted = true;
    render();
  } else if (['TOKEN_INVALID', 'REJOIN_EXPIRED', 'HOST_REJOIN_EXPIRED'].includes(code)) {
    sessionStorage.removeItem('lexiPlayerSession');
    localStorage.removeItem('lexiHostSession');
    Object.assign(state, { screen: 'join', role: null, roomCode: null, playerId: null, paused: false });
    render();
  } else if (state.screen === 'join') {
    app.querySelectorAll('button').forEach((button) => { button.disabled = false; });
  }
  toast.textContent = messages[code] || message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 6000);
}

function setScreen(screen) {
  const changed = state.screen !== screen;
  if (changed) clearVfx();
  state.screen = screen;
  render();
  if (changed) {
    const heading = app.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}

function setRoomUrl(roomCode = null) {
  const path = roomCode ? `/room=${encodeURIComponent(roomCode)}` : '/';
  if (window.location.pathname !== path) window.history.replaceState({}, '', path);
}

function roomCodeFromUrl() {
  const match = window.location.pathname.match(/^\/room=([A-Za-z0-9]{6})\/?$/);
  return match ? match[1].toUpperCase() : '';
}

function getHostSession() {
  try {
    const session = JSON.parse(localStorage.getItem('lexiHostSession'));
    return session?.roomCode === state.roomCode ? session : null;
  } catch (_error) {
    return null;
  }
}

function parseChatGptJson(value) {
  let text = String(value || '').replace(/^\uFEFF/, '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!text.startsWith('{')) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

function prepareQuestionEditor(jsonText, title) {
  try {
    const payload = parseChatGptJson(jsonText);
    if (!Array.isArray(payload.questions) || !payload.questions.length) throw new Error('Không tìm thấy danh sách questions.');
    state.editorTitle = title || payload.title || '';
    state.editorQuestions = payload.questions;
    state.editorSetId = null;
    state.editorJson = '';
    render();
  } catch (error) {
    showError({ message: error instanceof SyntaxError ? `JSON không hợp lệ: ${error.message}` : error.message });
  }
}

async function saveQuestionSet(payload) {
  if (!payload?.questions?.length || state.importingQuestions) return;
  const session = getHostSession();
  if (!session) return showError({ message: 'Không tìm thấy phiên Host. Hãy tạo lại phòng.' });
  state.importingQuestions = true;
  const importButton = app.querySelector('#import-questions');
  if (importButton) {
    importButton.disabled = true;
    importButton.textContent = 'Đang import…';
  }
  try {
    const setPath = state.editorSetId ? `/${encodeURIComponent(state.editorSetId)}` : '';
    const response = await fetch(`/api/rooms/${encodeURIComponent(state.roomCode)}/question-sets${setPath}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-host-token': session.hostToken
      },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (_error) {
      throw new Error(`Server import không trả JSON (HTTP ${response.status}). Hãy khởi động lại server Lexi Clash rồi thử lại.`);
    }
    if (!response.ok) {
      const detail = Array.isArray(result.details) && result.details.length ? ` ${result.details.join(' ')}` : '';
      throw new Error(`${result.message || 'Không thể import bộ câu hỏi.'}${detail}`);
    }
    state.questionSet = { source: result.source, title: result.title, count: result.count };
    state.editorSetId = result.set.id;
    state.editorTitle = result.title;
    state.editorQuestions = result.questions;
    showError({ message: `Đã import ${result.count} câu hỏi: ${result.title}` });
    await refreshLibrary(false);
    render();
  } catch (error) {
    showError({ message: error instanceof SyntaxError ? `JSON không hợp lệ: ${error.message}` : error.message });
  } finally {
    state.importingQuestions = false;
    const currentButton = app.querySelector('#import-questions');
    if (currentButton) {
      currentButton.disabled = false;
      currentButton.textContent = 'Kiểm tra và import';
    }
  }
}

async function refreshLibrary(shouldRender = true) {
  const session = getHostSession();
  if (!session) return;
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(state.roomCode)}/question-sets`, { headers: { 'x-host-token': session.hostToken } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    state.librarySets = result.sets || [];
    if (shouldRender && state.screen === 'lobby') render();
  } catch (error) {
    showError({ message: `Không tải được thư viện: ${error.message}` });
  }
}

async function loadLibrarySet(setId) {
  const session = getHostSession();
  if (!session || !setId) return;
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(state.roomCode)}/question-sets/${encodeURIComponent(setId)}`, { headers: { 'x-host-token': session.hostToken } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    state.editorSetId = result.id;
    state.editorTitle = result.title;
    state.editorQuestions = result.questions;
    state.editorJson = '';
    render();
  } catch (error) {
    showError({ message: `Không tải được bộ đề: ${error.message}` });
  }
}

function newQuestionSet() {
  state.editorSetId = null;
  state.editorTitle = '';
  state.editorJson = '';
  state.editorQuestions = [];
  render();
}

function updateEditorQuestions(questions, title) {
  state.editorQuestions = questions;
  state.editorTitle = title;
  render();
}

async function refreshQuestionSet() {
  const session = getHostSession();
  if (!session) return;
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(state.roomCode)}/questions`, {
      headers: { 'x-host-token': session.hostToken }
    });
    if (!response.ok) return;
    const result = await response.json();
    state.questionSet = { source: result.source, title: result.title, count: result.count };
    if (state.screen === 'lobby') render();
  } catch (_error) {
    // The lobby remains usable with its last known metadata when this optional refresh fails.
  }
}

function renderCountdown() {
  window.clearInterval(countdownTimer);
  app.innerHTML = `<section class="center-screen">${mascot('ready')}<h1 class="eyebrow">Trận đấu sắp bắt đầu</h1><div class="countdown" role="status"></div><p>Chuẩn bị cùng đội của bạn!</p>${state.role === 'host' ? '<button id="end-game-now" class="button danger" type="button">Kết thúc trận ngay</button>' : ''}</section>`;
  app.querySelector('#end-game-now')?.addEventListener('click', endGameNow);
  let lastSecond;
  const update = () => {
    const seconds = Math.max(0, Math.ceil((state.countdownEndsAt - Date.now()) / 1000));
    if (seconds !== lastSecond) app.querySelector('.countdown').textContent = seconds || 'GO!';
    lastSecond = seconds;
  };
  update();
  countdownTimer = window.setInterval(update, 200);
}

function endGameNow() {
  if (window.confirm('Kết thúc trận ngay và tổng kết theo điểm hiện tại?')) socket.emit('game:end');
}

function render() {
  disposeScreen();
  disposeScreen = () => {};
  window.clearTimeout(requestTimer);
  app.removeAttribute('aria-busy');
  document.body.dataset.screen = state.screen;
  setAudioContext(state.role, state.paused ? 'paused' : state.screen);
  window.clearInterval(countdownTimer);
  if (state.paused) {
    app.innerHTML = `<section class="center-screen">${mascot('loading')}<h1>Trận đấu đang tạm dừng</h1><p>Đang chờ giáo viên kết nối lại…</p></section>`;
    return;
  }
  if (state.screen === 'join') {
    renderJoinScreen(app, { onCreate: () => request('room:create'), onJoin: (payload) => request('room:join', payload) });
    const linkedCode = roomCodeFromUrl();
    if (linkedCode) app.querySelector('#room-code').value = linkedCode;
  } else if (state.screen === 'lobby') {
    renderLobbyScreen(app, state, {
      onMovePlayer: (playerId, targetTeam) => socket.emit('lobby:movePlayer', { playerId, targetTeam }),
      onStart: () => socket.emit('game:start'),
      onClose: () => socket.emit('room:close'),
      onPrepareQuestions: prepareQuestionEditor,
      onSaveQuestions: saveQuestionSet,
      onLoadLibrary: loadLibrarySet,
      onRefreshLibrary: refreshLibrary,
      onNewQuestionSet: newQuestionSet,
      onEditorChange: (json, title) => { state.editorJson = json; state.editorTitle = title; },
      onEditorQuestionsChange: updateEditorQuestions
    });
  } else if (state.screen === 'countdown') {
    renderCountdown();
  } else if (state.screen === 'question') {
    disposeScreen = renderQuestionScreen(app, state, {
      onStop: () => socket.emit('game:stopQuestion'),
      onEnd: endGameNow,
      onSubmit: (answer) => {
        if (state.submitted || state.pending || Date.now() >= state.question.endsAt) return;
        if (!socket.connected) return showError({ message: 'Chưa có kết nối. Vui lòng chờ rồi gửi lại.' });
        state.pending = true;
        state.selectedAnswer = answer;
        render();
        socket.emit('answer:submit', { questionId: state.question.questionId, answer });
        requestTimer = window.setTimeout(() => showError({ message: 'Chưa nhận được xác nhận. Bạn có thể gửi lại; hệ thống chỉ tính đáp án đầu tiên.' }), 5000);
      }
    });
  } else if (state.screen === 'reveal') {
    renderRevealScreen(app, state, { onNext: () => socket.emit('game:nextQuestion'), onEnd: endGameNow });
  } else if (state.screen === 'results') {
    renderResultsScreen(app, state, {
      onRestart: () => socket.emit('game:restart'),
      onClose: () => socket.emit('room:close')
    });
  }
}

socket.on('connect', () => {
  document.body.classList.remove('disconnected');
  document.querySelector('#connection-status').hidden = true;
  restoreSession();
});
socket.on('disconnect', () => {
  document.body.classList.add('disconnected');
  document.querySelector('#connection-status').hidden = false;
  showError({ message: 'Mất kết nối. Đang thử kết nối lại…' });
});

socket.on('room:created', ({ roomCode, hostToken }) => {
  state.role = 'host';
  state.roomCode = roomCode;
  setRoomUrl(roomCode);
  localStorage.setItem('lexiHostSession', JSON.stringify({ roomCode, hostToken }));
  state.questionSet = { source: 'demo', title: 'Bộ câu hỏi mẫu', count: 8 };
  setScreen('lobby');
  refreshQuestionSet();
  refreshLibrary();
  enableRoomMusic().catch(() => {});
});

socket.on('room:joined', ({ roomCode, playerId, playerToken, team, rejoined }) => {
  state.role = 'player';
  state.roomCode = roomCode;
  setRoomUrl(roomCode);
  state.playerId = playerId;
  state.playerTeam = team;
  sessionStorage.setItem('lexiPlayerSession', JSON.stringify({ roomCode, playerToken }));
  if (state.screen === 'join') setScreen('lobby');
  if (!rejoined) {
    enableRoomMusic().catch(() => {});
    playSfx('join', `${roomCode}:${playerId}`);
  }
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
  playCountdown(`${state.roomCode}:${endsAt}`);
  startCountdownAudio(endsAt, `${state.roomCode}:${endsAt}`);
});

socket.on('question:show', (question) => {
  stopCountdownAudio();
  state.question = question;
  state.submitted = false;
  state.pending = false;
  state.selectedAnswer = null;
  state.personalRound = null;
  state.submissionCount = {
    submitted: 0,
    total: state.players.filter((player) => player.isConnected && (!question.isLeaderDuel || player.isLeader)).length
  };
  setScreen('question');
  if (question.isBossRound) playBossEntrance(`${state.roomCode}:${question.questionId}`);
  scheduleQuestionAudio(question, `${state.roomCode}:${question.questionId}`);
});

socket.on('answer:ack', () => {
  state.pending = false;
  state.submitted = true;
  render();
  playSfx('answerSubmit', `${state.roomCode}:${state.question?.questionId}:${state.playerId}`);
});

socket.on('round:submissionCount', (counts) => {
  state.submissionCount = counts;
  if (state.screen === 'question') {
    if (state.role === 'host') render();
    else updateSubmissionStatus(app, state);
  }
});

socket.on('round:result', (result) => {
  clearQuestionAudio();
  const previousLeader = getLeader(state.teamScores);
  state.roundResult = result;
  state.teamScores = result.teamScores;
  setScreen('reveal');
  const currentLeader = getLeader(result.teamScores);
  if (currentLeader && currentLeader !== previousLeader) {
    playLeadChange(`${state.roomCode}:${result.questionId}`, currentLeader);
    if (state.role === 'host') playSfx('leadChange', `${state.roomCode}:${result.questionId}`, { duck: true });
  }
});

socket.on('round:personal', (result) => {
  state.personalRound = result;
  if (state.screen === 'reveal') {
    render();
    const resultKey = `${state.roomCode}:${state.roundResult?.questionId}:${state.playerId}`;
    if (result.isCorrect) {
      playCorrectAnswer(resultKey);
      playSfx('correct', resultKey, { duck: true });
    } else {
      playSfx('incorrect', resultKey);
    }
    if (result.xpEarned > 0) playSfx('xp', resultKey);
  }
});

socket.on('game:over', (result) => {
  state.gameResult = result;
  state.teamScores = result.teamScores;
  setScreen('results');
  playVictory(`${state.roomCode}:${result.winner}:${result.teamScores.red.battleScore}:${result.teamScores.blue.battleScore}`);
  if (state.role === 'host' && result.winner !== 'tie') playSfx('victory', `${state.roomCode}:${result.winner}:victory`, { duck: true, duration: 3000 });
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
  closeAudio();
  playSfx('roomClose', `${state.roomCode}:closed`);
  localStorage.removeItem('lexiHostSession');
  sessionStorage.removeItem('lexiPlayerSession');
  Object.assign(state, { screen: 'join', roomCode: null, playerId: null, role: null, paused: false });
  setRoomUrl();
  showError({ message: 'Phòng đã đóng.' });
  render();
});

socket.on('state:sync', (snapshot) => {
  state.pending = false;
  state.paused = snapshot.game?.state === 'PAUSED';
  state.roomCode = snapshot.roomId;
  state.players = snapshot.players;
  state.canStart = snapshot.canStart;
  if (state.paused) { render(); return; }
  if (!snapshot.game) setScreen('lobby');
  else if (snapshot.game.state === 'COUNTDOWN') {
    state.countdownEndsAt = snapshot.game.endsAt;
    setScreen('countdown');
  } else if (snapshot.game.state === 'QUESTION_ACTIVE') {
    if (state.question?.questionId !== snapshot.game.question.questionId) {
      state.submitted = false;
      state.selectedAnswer = null;
    }
    state.question = snapshot.game.question;
    state.teamScores = snapshot.game.teamScores;
    setScreen('question');
    scheduleQuestionAudio(snapshot.game.question, `${state.roomCode}:${snapshot.game.question.questionId}`, false);
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

function getLeader(scores) {
  const red = scores?.red?.battleScore || 0;
  const blue = scores?.blue?.battleScore || 0;
  if (red === blue) return null;
  return red > blue ? 'red' : 'blue';
}

function restoreSession() {
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
}

initAudioControls();
render();
enableLandingMusic().catch(() => {});
