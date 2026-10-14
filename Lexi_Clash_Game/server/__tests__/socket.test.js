'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { createLexiServer } = require('../index');

const gameQuestions = Array.from({ length: 8 }, (_value, index) => index === 7
  ? {
      id: 'fast_8', type: 'word_forge', prompt: 'Type library', options: null,
      correctAnswer: 'library', acceptedAnswers: ['library'], explanation: 'Library is correct', timeLimitSec: 0.05, isBossRound: true
    }
  : {
      id: `fast_${index + 1}`, type: 'multiple_choice', prompt: 'Pick B', options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
      correctAnswer: 'B', acceptedAnswers: ['B'], explanation: 'B is correct', timeLimitSec: 0.05, isBossRound: false
    });

function waitFor(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    function handler(payload) {
      clearTimeout(timeout);
      resolve(payload);
    }
    socket.once(event, handler);
  });
}

async function emitAndWait(socket, emitEvent, payload, responseEvent) {
  const response = waitFor(socket, responseEvent);
  socket.emit(emitEvent, payload);
  return response;
}

describe('Socket.IO lobby integration', () => {
  let server;
  let url;
  let clients;

  beforeEach(async () => {
    server = createLexiServer({
      questions: gameQuestions,
      gameOptions: { countdownMs: 20, graceMs: 10, resultMs: 1000 },
      answerRateWindowMs: 100
    });
    const address = await server.listen(0);
    url = `http://127.0.0.1:${address.port}`;
    clients = [];
  });

  afterEach(async () => {
    for (const client of clients) client.disconnect();
    await server.close();
  });

  async function connect() {
    const client = createClient(url, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    await waitFor(client, 'connect');
    return client;
  }

  async function createRoom(host) {
    return emitAndWait(host, 'room:create', {}, 'room:created');
  }

  async function setupGame() {
    const host = await connect();
    const red = await connect();
    const blue = await connect();
    const created = await createRoom(host);
    const redJoined = await emitAndWait(red, 'room:join', { roomCode: created.roomCode, displayName: 'Red Player' }, 'room:joined');
    const blueJoined = await emitAndWait(blue, 'room:join', { roomCode: created.roomCode, displayName: 'Blue Player' }, 'room:joined');
    return { host, red, blue, created, redJoined, blueJoined };
  }

  test('host creates a room with a six-character code and token', async () => {
    const host = await connect();
    const created = await createRoom(host);
    assert.match(created.roomCode, /^[ACDEFGHJKMNPQRTUVWXY]{6}$/);
    assert.equal(typeof created.hostToken, 'string');
  });

  test('two players join balanced teams and everyone receives lobby updates', async () => {
    const host = await connect();
    const first = await connect();
    const second = await connect();
    const { roomCode } = await createRoom(host);

    const hostUpdateOne = waitFor(host, 'lobby:update');
    const firstJoined = await emitAndWait(first, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    const firstLobby = await hostUpdateOne;
    assert.equal(firstJoined.team, 'red');
    assert.equal(firstLobby.players.length, 1);

    const hostUpdateTwo = waitFor(host, 'lobby:update');
    const firstUpdateTwo = waitFor(first, 'lobby:update');
    const secondJoined = await emitAndWait(second, 'room:join', { roomCode, displayName: 'Lan' }, 'room:joined');
    const [hostLobby, firstLobbyAfterJoin] = await Promise.all([hostUpdateTwo, firstUpdateTwo]);
    assert.equal(secondJoined.team, 'blue');
    assert.equal(hostLobby.canStart, true);
    assert.equal(firstLobbyAfterJoin.players.length, 2);
  });

  test('host moves a player and all clients receive the changed team', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    await waitFor(host, 'lobby:update');

    const hostUpdate = waitFor(host, 'lobby:update');
    const playerUpdate = waitFor(player, 'lobby:update');
    host.emit('lobby:movePlayer', { playerId: joined.playerId, targetTeam: 'blue' });
    const [hostLobby, playerLobby] = await Promise.all([hostUpdate, playerUpdate]);
    assert.equal(hostLobby.players[0].team, 'blue');
    assert.equal(playerLobby.players[0].team, 'blue');
  });

  test('non-host cannot move a player', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    const error = await emitAndWait(player, 'lobby:movePlayer', { playerId: joined.playerId, targetTeam: 'blue' }, 'error:notice');
    assert.equal(error.code, 'NOT_HOST');
  });

  test('invalid room join returns a scoped error', async () => {
    const player = await connect();
    const error = await emitAndWait(player, 'room:join', { roomCode: 'AAAAAA', displayName: 'Minh' }, 'error:notice');
    assert.equal(error.code, 'ROOM_NOT_FOUND');
  });

  test('disconnected player can rejoin with the same identity', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    await waitFor(host, 'lobby:update');
    const offlineUpdate = waitFor(host, 'lobby:update');
    player.disconnect();
    await offlineUpdate;

    const rejoinedClient = await connect();
    const syncPromise = waitFor(rejoinedClient, 'state:sync');
    const rejoined = await emitAndWait(rejoinedClient, 'room:rejoin', { roomCode, playerToken: joined.playerToken }, 'room:joined');
    const snapshot = await syncPromise;
    assert.equal(rejoined.playerId, joined.playerId);
    assert.equal(rejoined.rejoined, true);
    assert.equal(snapshot.players[0].isConnected, true);
  });

  test('starts a synchronized countdown and hides correct answers from question payloads', async () => {
    const { host, red, blue } = await setupGame();
    const hostCountdown = waitFor(host, 'game:countdown');
    const redCountdown = waitFor(red, 'game:countdown');
    const blueQuestion = waitFor(blue, 'question:show');
    host.emit('game:start');
    const [hostValue, redValue, question] = await Promise.all([hostCountdown, redCountdown, blueQuestion]);
    assert.equal(hostValue.endsAt, redValue.endsAt);
    assert.equal(question.questionId, 'fast_1');
    assert.equal(question.correctAnswer, undefined);
    assert.equal(question.acceptedAnswers, undefined);
  });

  test('accepts only the first answer and emits private and public round results', async () => {
    const { host, red, blue } = await setupGame();
    const questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    const question = await questionPromise;
    const ack = await emitAndWait(red, 'answer:submit', { questionId: question.questionId, answer: 'B' }, 'answer:ack');
    assert.equal(ack.received, true);
    const duplicate = await emitAndWait(red, 'answer:submit', { questionId: question.questionId, answer: 'A' }, 'error:notice');
    assert.equal(duplicate.code, 'ALREADY_ANSWERED');
    const publicPromise = waitFor(host, 'round:result');
    const personalPromise = waitFor(red, 'round:personal');
    blue.emit('answer:submit', { questionId: question.questionId, answer: 'A' });
    const [publicResult, personalResult] = await Promise.all([publicPromise, personalPromise]);
    assert.equal(publicResult.correctAnswer, 'B');
    assert.equal(publicResult.teamScores.red.battleScore, 100);
    assert.equal(publicResult.teamScores.blue.battleScore, 30);
    assert.equal(personalResult.isCorrect, true);
    assert.ok(personalResult.xpEarned >= 100);
  });

  test('plays all rounds, applies boss multiplier and emits personal final review', async () => {
    const { host, red, blue } = await setupGame();
    let questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    let question = await questionPromise;
    red.emit('answer:submit', { questionId: question.questionId, answer: 'B' });
    blue.emit('answer:submit', { questionId: question.questionId, answer: 'A' });
    await waitFor(host, 'round:result');

    let bossResult;
    for (let roundIndex = 1; roundIndex < gameQuestions.length; roundIndex += 1) {
      questionPromise = waitFor(red, 'question:show');
      host.emit('game:nextQuestion');
      question = await questionPromise;
      const resultPromise = waitFor(host, 'round:result');
      red.emit('answer:submit', { questionId: question.questionId, answer: question.type === 'word_forge' ? 'library' : 'B' });
      blue.emit('answer:submit', { questionId: question.questionId, answer: 'wrong' });
      bossResult = await resultPromise;
    }
    assert.equal(question.isBossRound, true);
    assert.equal(bossResult.teamScores.red.battleScore, 900);
    assert.equal(bossResult.teamScores.blue.battleScore, 270);

    const gameOverPromise = waitFor(red, 'game:over');
    const personalPromise = waitFor(red, 'game:personal');
    host.emit('game:nextQuestion');
    const [gameOver, personal] = await Promise.all([gameOverPromise, personalPromise]);
    assert.equal(gameOver.winner, 'red');
    assert.equal(personal.missedQuestions.length, 0);
    assert.equal(personal.accuracy, 1);
  });

  test('rate limits more than five answer attempts per second', async () => {
    const { host, red } = await setupGame();
    const questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    await questionPromise;
    const limited = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Rate limit was not enforced')), 2000);
      red.on('error:notice', (error) => {
        if (error.code === 'RATE_LIMITED') {
          clearTimeout(timeout);
          resolve(error);
        }
      });
    });
    for (let index = 0; index < 6; index += 1) {
      red.emit('answer:submit', { questionId: 'wrong-question', answer: 'A' });
    }
    assert.equal((await limited).code, 'RATE_LIMITED');
  });

  test('late joiner receives current state but becomes eligible next round', async () => {
    const { host, red, created } = await setupGame();
    const questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    const question = await questionPromise;
    const latePlayer = await connect();
    const syncPromise = waitFor(latePlayer, 'state:sync');
    await emitAndWait(latePlayer, 'room:join', { roomCode: created.roomCode, displayName: 'Late Player' }, 'room:joined');
    const snapshot = await syncPromise;
    assert.equal(snapshot.game.state, 'QUESTION_ACTIVE');
    const error = await emitAndWait(latePlayer, 'answer:submit', { questionId: question.questionId, answer: 'B' }, 'error:notice');
    assert.equal(error.code, 'NOT_ELIGIBLE');
  });

  test('host disconnect pauses the game and host token restores state', async () => {
    const { host, red, created } = await setupGame();
    const questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    await questionPromise;
    const pausedPromise = waitFor(red, 'room:paused');
    host.disconnect();
    const paused = await pausedPromise;
    assert.equal(paused.reason, 'host_disconnect');

    const newHost = await connect();
    const resumedPromise = waitFor(red, 'room:resumed');
    const syncPromise = waitFor(newHost, 'state:sync');
    const rejoined = await emitAndWait(newHost, 'room:hostRejoin', created, 'room:created');
    const [resumed, snapshot] = await Promise.all([resumedPromise, syncPromise]);
    assert.equal(rejoined.rejoined, true);
    assert.deepEqual(resumed, {});
    assert.ok(['QUESTION_ACTIVE', 'ROUND_RESULT'].includes(snapshot.game.state));
  });

  test('host can reset a finished game back to the lobby', async () => {
    const { host, red, blue } = await setupGame();
    let questionPromise = waitFor(red, 'question:show');
    host.emit('game:start');
    let question = await questionPromise;
    red.emit('answer:submit', { questionId: question.questionId, answer: 'B' });
    blue.emit('answer:submit', { questionId: question.questionId, answer: 'A' });
    await waitFor(host, 'round:result');
    for (let roundIndex = 1; roundIndex < gameQuestions.length; roundIndex += 1) {
      questionPromise = waitFor(red, 'question:show');
      host.emit('game:nextQuestion');
      question = await questionPromise;
      const resultPromise = waitFor(host, 'round:result');
      red.emit('answer:submit', { questionId: question.questionId, answer: question.type === 'word_forge' ? 'library' : 'B' });
      await resultPromise;
    }
    const overPromise = waitFor(host, 'game:over');
    host.emit('game:nextQuestion');
    await overPromise;
    const restartedPromise = waitFor(red, 'game:restarted');
    host.emit('game:restart');
    await restartedPromise;
    assert.equal(server.roomManager.getRoom(Array.from(server.roomManager.rooms.keys())[0]).state, 'LOBBY');
  });
});
