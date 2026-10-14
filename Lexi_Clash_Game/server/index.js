'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManagerModule = require('./roomManager');
const gameManagerModule = require('./gameManager');
const { getQuestions } = require('./questionBank');

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
  return { code: error.code || 'INTERNAL_ERROR', message: error.code ? error.message : 'Unexpected server error' };
}

function createLexiServer(options = {}) {
  const roomManager = options.roomManager || roomManagerModule.createRoomManager();
  const questions = options.questions || getQuestions();
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

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/ping', (_request, response) => response.json({ ok: true }));

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
      const game = gameManager.getGame(room.roomId) || gameManager.createGame(room, questions);
      gameManager.startGame(game.roomId);
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
        player.isConnected && player.joinedAtRound <= game.currentRoundIndex).length;
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

  return { app, httpServer, io, roomManager, gameManager, listen, close };
}

if (require.main === module) {
  const server = createLexiServer();
  server.listen(DEFAULT_PORT).then(() => console.log(`Lexi Clash server listening on http://localhost:${DEFAULT_PORT}`));
}

module.exports = { createLexiServer };
