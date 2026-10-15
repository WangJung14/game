'use strict';

require('./loadEnv').loadEnv();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManagerModule = require('./roomManager');
const gameManagerModule = require('./gameManager');
const { getQuestions } = require('./questionBank');
const { parseCsv, normalizeQuestionSet } = require('./questionImport');
const { createSupabaseQuestionStore } = require('./questionStore');

const DEFAULT_PORT = process.env.PORT || 3000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const HOST_REJOIN_MS = 120 * 1000;
const ANSWER_RATE_LIMIT = 5;

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function errorPayload(error) {
  return {
    code: error.code || 'INTERNAL_ERROR',
    message: error.code ? error.message : 'Unexpected server error',
    ...(error.details ? { details: error.details } : {})
  };
}

function createLexiServer(options = {}) {
  const roomManager = options.roomManager || roomManagerModule.createRoomManager();
  const defaultQuestions = options.questions || getQuestions();
  const questionStore = options.questionStore || createSupabaseQuestionStore(options.supabase || {});
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const hostTimers = new Map();
  const answerRateWindowMs = options.answerRateWindowMs ?? 1000;

  function emitGameEvent(event, payload, game) {
    if (event === 'round:result') {
      io.to(game.roomId).emit(event, payload);
      for (const player of game.room.players.values()) {
        if (player.socketId) io.to(player.socketId).emit('round:personal', gameManager.getPlayerRoundResult(game, player.playerId));
      }
      return;
    }
    if (event === 'game:over') {
      io.to(game.roomId).emit(event, payload);
      for (const player of game.room.players.values()) {
        if (player.socketId) io.to(player.socketId).emit('game:personal', gameManager.getPlayerGameResult(game, player.playerId));
      }
      return;
    }
    io.to(game.roomId).emit(event, payload);
  }

  const gameManager = options.gameManager || gameManagerModule.createGameManager({
    ...(options.gameOptions || {}),
    onEvent: emitGameEvent
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.text({ type: ['text/csv', 'application/csv'], limit: '2mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/ping', (_request, response) => response.json({ ok: true }));
  app.get(/^\/room=/, (_request, response) => {
    response.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  function emitLobby(roomCode) {
    const state = roomManager.getRoomState(roomCode);
    io.to(roomCode).emit('lobby:update', { players: state.players, canStart: state.canStart });
  }

  function requireHost(socket) {
    const { role, roomCode } = socket.data || {};
    const room = roomManager.getRoom(roomCode);
    if (role !== 'host' || !room || room.hostSocketId !== socket.id) {
      throw codedError('NOT_HOST', 'Only the host can perform this action');
    }
    return room;
  }

  function requireHttpHost(request) {
    const roomCode = String(request.params.roomCode || '').trim().toUpperCase();
    const room = roomManager.getRoom(roomCode);
    const hostToken = request.get('x-host-token');
    if (!room || !hostToken || room.hostToken !== hostToken) throw codedError('NOT_HOST', 'A valid Host token is required');
    return room;
  }

  function questionSetMetadata(room) {
    return {
      source: room.questions ? 'imported' : 'demo',
      title: room.questionSetTitle || 'Bộ câu hỏi mẫu',
      count: room.questions?.length || defaultQuestions.length
    };
  }

  app.get('/api/question-template.csv', (_request, response) => {
    response.type('text/csv').attachment('lexi-clash-question-template.csv').send([
      'type,level,topic,prompt,option_a,option_b,option_c,option_d,correct_answer,accepted_answers,explanation,time_limit,boss_round,points',
      'multiple_choice,A2,school,Choose the correct answer.,First,Second,Third,Fourth,B,B,Explain why B is correct.,20,false,100',
      'word_forge,A2,vocabulary,Type the word.,,,,,library,library|Library,A place that lends books.,25,false,100'
    ].join('\n'));
  });

  app.get('/api/question-template.json', (_request, response) => {
    response.download(path.join(__dirname, '..', 'data', 'question-set.seed.json'), 'lexi-clash-question-template.json');
  });

  app.get('/api/rooms/:roomCode/questions', async (request, response) => {
    try {
      const room = requireHttpHost(request);
      response.json({ ...questionSetMetadata(room), questions: room.questions || defaultQuestions });
    } catch (error) {
      response.status(error.code === 'NOT_HOST' ? 403 : 400).json(errorPayload(error));
    }
  });

  app.put('/api/rooms/:roomCode/questions', async (request, response) => {
    try {
      const room = requireHttpHost(request);
      if (room.state !== gameManagerModule.STATES.LOBBY) throw codedError('INVALID_STATE', 'Questions can only be changed in the lobby');
      const imported = typeof request.body === 'string' ? parseCsv(request.body) : request.body;
      const normalized = normalizeQuestionSet(imported);
      const title = String(request.get('x-question-set-title') || request.body?.title || 'Bộ câu hỏi đã import').trim().slice(0, 120);
      await questionStore.save({ roomCode: room.roomId, title, questions: normalized });
      room.questions = normalized;
      room.questionSetTitle = title;
      response.json({ source: 'imported', title, count: normalized.length, questions: normalized });
    } catch (error) {
      const status = error.code === 'NOT_HOST' ? 403 : error.code === 'QUESTION_STORE_UNAVAILABLE' ? 503 : 400;
      response.status(status).json(errorPayload(error));
    }
  });

  app.get('/api/rooms/:roomCode/question-sets', async (request, response) => {
    try {
      requireHttpHost(request);
      response.json({ sets: await questionStore.listSets() });
    } catch (error) {
      response.status(error.code === 'NOT_HOST' ? 403 : 503).json(errorPayload(error));
    }
  });

  app.get('/api/rooms/:roomCode/question-sets/:setId', async (request, response) => {
    try {
      requireHttpHost(request);
      const set = await questionStore.getSet(request.params.setId);
      if (!set) throw codedError('QUESTION_SET_NOT_FOUND', 'Question set was not found');
      response.json(set);
    } catch (error) {
      response.status(error.code === 'NOT_HOST' ? 403 : error.code === 'QUESTION_SET_NOT_FOUND' ? 404 : 503).json(errorPayload(error));
    }
  });

  app.put('/api/rooms/:roomCode/question-sets/:setId?', async (request, response) => {
    try {
      const room = requireHttpHost(request);
      if (room.state !== gameManagerModule.STATES.LOBBY) throw codedError('INVALID_STATE', 'Question sets can only be changed in the lobby');
      const questions = normalizeQuestionSet(request.body);
      const title = String(request.body?.title || 'Untitled question set').trim().slice(0, 120);
      if (!title) throw codedError('INVALID_QUESTION_SET', 'Question set title is required');
      const saved = await questionStore.saveSet({ id: request.params.setId || null, title, description: String(request.body?.description || '').trim().slice(0, 500), questions });
      await questionStore.save({ roomCode: room.roomId, title, questions });
      room.questions = questions;
      room.questionSetTitle = title;
      response.json({ set: saved, source: 'library', title, count: questions.length, questions });
    } catch (error) {
      const status = error.code === 'NOT_HOST' ? 403 : error.code === 'QUESTION_STORE_UNAVAILABLE' ? 503 : 400;
      response.status(status).json(errorPayload(error));
    }
  });

  app.post('/api/rooms/:roomCode/question-sets/:setId/select', async (request, response) => {
    try {
      const room = requireHttpHost(request);
      if (room.state !== gameManagerModule.STATES.LOBBY) throw codedError('INVALID_STATE', 'Question sets can only be selected in the lobby');
      const set = await questionStore.getSet(request.params.setId);
      if (!set) throw codedError('QUESTION_SET_NOT_FOUND', 'Question set was not found');
      const questions = normalizeQuestionSet(set.questions);
      await questionStore.save({ roomCode: room.roomId, title: set.title, questions });
      room.questions = questions;
      room.questionSetTitle = set.title;
      response.json({ source: 'library', title: set.title, count: questions.length, questions, setId: set.id });
    } catch (error) {
      const status = error.code === 'NOT_HOST' ? 403 : error.code === 'QUESTION_SET_NOT_FOUND' ? 404 : error.code === 'QUESTION_STORE_UNAVAILABLE' ? 503 : 400;
      response.status(status).json(errorPayload(error));
    }
  });

  function syncState(socket, roomCode, playerId = null) {
    const roomState = roomManager.getRoomState(roomCode);
    const game = gameManager.getGame(roomCode);
    socket.emit('state:sync', {
      ...roomState,
      game: game ? gameManager.getStateSnapshot(roomCode, playerId) : null
    });
  }

  function handle(socket, action) {
    try {
      action();
    } catch (error) {
      socket.emit('error:notice', errorPayload(error));
    }
  }

  io.on('connection', (socket) => {
    socket.data.answerAttempts = [];

    socket.on('room:create', () => handle(socket, () => {
      const room = roomManager.createRoom(socket.id);
      socket.join(room.roomId);
      socket.data = { ...socket.data, role: 'host', roomCode: room.roomId };
      socket.emit('room:created', { roomCode: room.roomId, hostToken: room.hostToken });
    }));

    socket.on('room:join', (payload = {}) => handle(socket, () => {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const game = gameManager.getGame(roomCode);
      const player = roomManager.joinRoom(roomCode, payload.displayName, socket.id, game?.currentRoundIndex ?? -1);
      socket.join(roomCode);
      socket.data = { ...socket.data, role: 'player', roomCode, playerId: player.playerId };
      socket.emit('room:joined', {
        roomCode, playerId: player.playerId, playerToken: player.playerToken,
        team: player.team, displayName: player.displayName
      });
      emitLobby(roomCode);
      if (game) syncState(socket, roomCode, player.playerId);
    }));

    socket.on('room:rejoin', (payload = {}) => handle(socket, () => {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const player = roomManager.rejoinRoom(roomCode, payload.playerToken, socket.id);
      socket.join(roomCode);
      socket.data = { ...socket.data, role: 'player', roomCode, playerId: player.playerId };
      socket.emit('room:joined', {
        roomCode, playerId: player.playerId, playerToken: player.playerToken,
        team: player.team, displayName: player.displayName, rejoined: true
      });
      syncState(socket, roomCode, player.playerId);
      emitLobby(roomCode);
    }));

    socket.on('room:hostRejoin', (payload = {}) => handle(socket, () => {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room || room.hostToken !== payload.hostToken) throw codedError('TOKEN_INVALID', 'Host token is invalid');
      if (room.hostDisconnectedAt && Date.now() - room.hostDisconnectedAt > HOST_REJOIN_MS) {
        throw codedError('HOST_REJOIN_EXPIRED', 'Host rejoin window has expired');
      }
      const timer = hostTimers.get(roomCode);
      if (timer) clearTimeout(timer);
      hostTimers.delete(roomCode);
      room.hostSocketId = socket.id;
      room.hostDisconnectedAt = null;
      socket.join(roomCode);
      socket.data = { ...socket.data, role: 'host', roomCode };
      const game = gameManager.getGame(roomCode);
      if (game?.state === gameManagerModule.STATES.PAUSED) {
        gameManager.resumeGame(roomCode);
        io.to(roomCode).emit('room:resumed', {});
      }
      socket.emit('room:created', { roomCode, hostToken: room.hostToken, rejoined: true });
      syncState(socket, roomCode);
    }));

    socket.on('lobby:movePlayer', (payload = {}) => handle(socket, () => {
      const room = requireHost(socket);
      roomManager.movePlayer(room.roomId, payload.playerId, payload.targetTeam);
      emitLobby(room.roomId);
    }));

    socket.on('game:start', () => handle(socket, () => {
      const room = requireHost(socket);
      roomManager.assignTeamLeaders(room.roomId, true);
      emitLobby(room.roomId);
      const game = gameManager.getGame(room.roomId) || gameManager.createGame(room, room.questions || defaultQuestions);
      gameManager.startGame(game.roomId);
    }));

    socket.on('game:stopQuestion', () => handle(socket, () => {
      const room = requireHost(socket);
      gameManager.lockQuestion(room.roomId);
    }));

    socket.on('answer:submit', (payload = {}) => handle(socket, () => {
      const { role, roomCode, playerId } = socket.data || {};
      if (role !== 'player') throw codedError('NOT_PLAYER', 'Only players can submit answers');
      const timestamp = Date.now();
      socket.data.answerAttempts = socket.data.answerAttempts.filter((attempt) => timestamp - attempt < answerRateWindowMs);
      if (socket.data.answerAttempts.length >= ANSWER_RATE_LIMIT) throw codedError('RATE_LIMITED', 'Too many answer attempts');
      socket.data.answerAttempts.push(timestamp);
      const submission = gameManager.submitAnswer(roomCode, playerId, payload.questionId, payload.answer, timestamp);
      socket.emit('answer:ack', { questionId: submission.questionId, received: true });
      const game = gameManager.getGame(roomCode);
      const eligiblePlayers = Array.from(game.room.players.values()).filter((player) =>
        player.isConnected && player.joinedAtRound <= game.currentRoundIndex &&
        (game.currentRoundIndex !== game.leaderDuelRoundIndex ||
          game.leaderDuelPlayers?.[player.team] === player.playerId)).length;
      io.to(roomCode).emit('round:submissionCount', { submitted: game.submissions.size, total: eligiblePlayers });
    }));

    socket.on('game:nextQuestion', () => handle(socket, () => {
      const room = requireHost(socket);
      gameManager.nextQuestion(room.roomId);
    }));

    socket.on('game:end', () => handle(socket, () => {
      const room = requireHost(socket);
      gameManager.endGame(room.roomId);
    }));

    socket.on('game:restart', () => handle(socket, () => {
      const room = requireHost(socket);
      gameManager.resetGame(room.roomId);
      io.to(room.roomId).emit('game:restarted', {});
      emitLobby(room.roomId);
    }));

    socket.on('room:close', () => handle(socket, () => {
      const room = requireHost(socket);
      io.to(room.roomId).emit('room:closed', { reason: 'host_closed' });
      roomManager.deleteRoom(room.roomId);
      gameManager.games.delete(room.roomId);
    }));

    socket.on('disconnect', () => {
      const { role, roomCode, playerId } = socket.data || {};
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      if (role === 'player' && playerId) {
        handle(socket, () => {
          roomManager.leaveRoom(roomCode, playerId);
          emitLobby(roomCode);
        });
        return;
      }
      if (role === 'host' && room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        room.hostDisconnectedAt = Date.now();
        const game = gameManager.getGame(roomCode);
        if (game && [gameManagerModule.STATES.QUESTION_ACTIVE, gameManagerModule.STATES.ROUND_RESULT].includes(game.state)) {
          gameManager.pauseGame(roomCode);
          io.to(roomCode).emit('room:paused', { reason: 'host_disconnect', resumeDeadline: Date.now() + HOST_REJOIN_MS });
        }
        const timer = setTimeout(() => {
          io.to(roomCode).emit('room:closed', { reason: 'host_timeout' });
          roomManager.deleteRoom(roomCode);
          gameManager.games.delete(roomCode);
          hostTimers.delete(roomCode);
        }, HOST_REJOIN_MS);
        timer.unref();
        hostTimers.set(roomCode, timer);
      }
    });
  });

  const cleanupTimer = setInterval(() => {
    for (const roomCode of roomManager.rooms.keys()) roomManager.removeDisconnectedPlayers(roomCode);
    roomManager.cleanupExpired();
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  function listen(port = DEFAULT_PORT) {
    return new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, () => {
        httpServer.off('error', reject);
        resolve(httpServer.address());
      });
    });
  }

  function close() {
    clearInterval(cleanupTimer);
    for (const timer of hostTimers.values()) clearTimeout(timer);
    return new Promise((resolve) => io.close(resolve));
  }

  return { app, httpServer, io, roomManager, gameManager, questionStore, listen, close };
}

if (require.main === module) {
  const server = createLexiServer();
  server.listen(DEFAULT_PORT).then(() => console.log(`Lexi Clash server listening on http://localhost:${DEFAULT_PORT}`));
}

module.exports = { createLexiServer };
